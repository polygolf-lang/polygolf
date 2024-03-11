import {
  defaultWhitespaceInsertLogic,
  PrecedenceVisitorEmitter,
  type Token,
} from "../../common/Language";
import { EmitError, emitIntLiteral, emitTextFactory } from "../../common/emit";
import { isText, isOfKind, id, type Node } from "../../IR";
import { type CompilationContext } from "../../common/compile";
import { $, type PathFragment } from "../../common/fragments";
import type { Spine } from "../../common/Spine";

function escapeRegExp(string: string) {
  // https://stackoverflow.com/a/6969486/14611638
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

function codepointMap(x: number) {
  if (x < 128) return `\\x${x.toString(16).padStart(2, "0")}`;
  if (x < 1 << 16) return `\\u${x.toString(16).padStart(4, "0")}`;
  return `\\u{${x.toString(16)}}`;
}

export const emitJavascriptText = emitTextFactory(
  {
    '"TEXT"': { "\\": `\\\\`, "\n": `\\n`, "\r": `\\r`, '"': `\\"` },
    "'TEXT'": { "\\": `\\\\`, "\n": `\\n`, "\r": `\\r`, "'": `\\"` },
    "`TEXT`": { "\\": `\\\\`, "`": "\\`", "${": "\\${" },
  },
  codepointMap,
);
export const emitJavascriptTextBackticks = emitTextFactory(
  {
    "`TEXT`": { "\\": `\\\\`, "`": "\\`", "${": "\\${" },
  },
  codepointMap,
);

function binaryPrecedence(opname: string): number {
  switch (opname) {
    case "**":
      return 13;
    case "*":
    case "/":
    case "%":
      return 12;
    case "+":
    case "-":
      return 11;
    case "<<":
    case ">>":
    case ">>>":
      return 10;
    case "<":
    case "<=":
    case ">=":
    case ">":
    case "in":
      return 9;
    case "==":
    case "!=":
    case "===":
    case "!==":
      return 8;
    case "&":
      return 7;
    case "^":
      return 6;
    case "|":
      return 5;
    case "&&":
      return 4;
    case "||":
      return 3;
  }
  if (opname.endsWith("=")) return 0;
  throw new Error(
    `Programming error - unknown Javascript binary operator '${opname}.'`,
  );
}

export class JavascriptEmitter extends PrecedenceVisitorEmitter {
  detokenize(tokens: Token[]) {
    let result = "";
    tokens.forEach((token, i) => {
      if (i === tokens.length - 1) result += token;
      else {
        const nextToken = tokens[i + 1];
        if (token === "\n" && "([`+-/".includes(nextToken[0])) {
          token = ";";
        }
        result += token;
        if (defaultWhitespaceInsertLogic(token, nextToken)) {
          result += " ";
        }
      }
    });
    return result;
  }

  prec(expr: Node): number {
    switch (expr.kind) {
      case "PropertyCall":
      case "FunctionCall":
        return 17;
      case "Postfix":
        return 15;
      case "Prefix":
        return 14;
      case "Infix":
        return binaryPrecedence(expr.name);
      case "Function":
        return 2;
      case "ConditionalOp":
        return 1;
    }
    return Infinity;
  }

  minPrecForNoParens(parent: Node, fragment: PathFragment) {
    const kind = parent.kind;
    const prop = fragment.prop;
    return prop === "object"
      ? this.prec(parent)
      : prop === "collection" && kind === "IndexCall"
        ? Infinity
        : kind === "ConditionalOp"
          ? prop === "condition"
            ? this.prec(parent) + 1
            : prop === "consequent"
              ? -Infinity
              : this.prec(parent)
          : kind === "Infix"
            ? prop === "left"
              ? this.prec(parent) + (parent.name === "**" ? 1 : 0)
              : this.prec(parent) + (parent.name === "**" ? 0 : 1)
            : kind === "Prefix" || kind === "Postfix"
              ? this.prec(parent)
              : -Infinity;
  }

  visitNoParens(n: Node, s: Spine, context: CompilationContext) {
    switch (n.kind) {
      case "Cast":
        if (n.targetType === "array") {
          return ["[...", $.expr, "]"];
        }
        throw new EmitError(n, "unsuported cast target type");
      case "VarDeclarationWithAssignment":
        return ["let", $.assignment];
      case "Block":
        return s.isRoot
          ? $.children.join("\n")
          : n.children.some(
                isOfKind(
                  "If",
                  "While",
                  "ForEach",
                  "ForCLike",
                  "VarDeclarationWithAssignment",
                ),
              )
            ? ["{", $.children.join("\n"), "}"]
            : $.children.join(",");
      case "Function":
        return ["(", $.args.join(","), ")", "=>", $.expr];
      case "Assignment":
        return [$.variable, "=", $.expr];
      case "FunctionCall":
        if (n.args.length === 1 && isText()(n.args[0]))
          return [$.func, emitJavascriptTextBackticks(n.args[0].value)];
        return [$.func, "(", $.args.join(","), ")"];
      case "Identifier":
        return n.name;
      case "Text":
        return n.targetType?.startsWith("regex") === true
          ? `/${escapeRegExp(n.value)}/${n.targetType.split(" ")[1]}`
          : emitJavascriptText(n.value, context.options.codepointRange);
      case "Integer":
        return (
          emitIntLiteral(n, { 10: ["", ""], 16: ["0x", ""] }) +
          (n.targetType === "bigint" ? "n" : "")
        );
      case "List":
      case "Array":
        return ["[", $.value.join(","), "]"];
      case "Table":
        return ["{", $.value.join(","), "}"];
      case "KeyValue":
        return [
          isText()(n.key) && /\w*/.test(n.key.value)
            ? n.key.value
            : ["[", $.key, "]"],
          ":",
          $.value,
        ];
      case "ConditionalOp":
        return [$.condition, "?", $.consequent, ":", $.alternate];
      case "While":
        return [`while`, "(", $.condition, ")", $.body];
      case "If":
        return [
          "if",
          "(",
          $.condition,
          ")",
          $.consequent,
          n.alternate !== undefined ? ["else", $.alternate] : [],
        ];
      case "OneToManyAssignment":
        return [$.variables.join("="), "=", $.expr];
      case "IndexCall":
        return [$.collection, "[", $.index, "]"];
      case "PropertyCall":
        return [$.object, ".", $.ident];
      case "Infix":
        return [$.left, n.name, $.right];
      case "Prefix":
        return [n.name, $.arg];
      case "Postfix":
        return [$.arg, n.name];
      case "ForEach":
        return [
          `for`,
          "(",
          (n.variable ?? id()).name,
          n.collection.targetType === "object" ? "in" : "of",
          $.collection,
          ")",
          $.body,
        ];
      case "ForCLike":
        return [
          "for",
          "(",
          [$.init, ";", $.condition, ";", $.append],
          ")",
          $.body,
        ];

      default:
        throw new EmitError(n);
    }
  }
}
