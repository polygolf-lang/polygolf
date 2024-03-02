import { PrecedenceVisitorEmitter, type Token } from "../../common/Language";
import {
  EmitError,
  emitIntLiteral,
  emitTextFactory,
  joinTrees,
} from "../../common/emit";
import { type Node } from "../../IR";
import { type CompilationContext } from "../../common/compile";
import { $, type PathFragment } from "../../common/fragments";
import type { Spine } from "../../common/Spine";

const unicode01to09repls = {
  "\u{1}": `\\u{1}`,
  "\u{2}": `\\u{2}`,
  "\u{3}": `\\u{3}`,
  "\u{4}": `\\u{4}`,
  "\u{5}": `\\u{5}`,
  "\u{6}": `\\u{6}`,
  "\u{7}": `\\u{7}`,
  "\u{8}": `\\u{8}`,
  "\u{9}": `\\u{9}`,
} as const;
const unicode0Bto1Frepls = {
  "\u{b}": `\\u{b}`,
  "\u{c}": `\\u{c}`,
  "\u{d}": `\\u{d}`,
  "\u{e}": `\\u{e}`,
  "\u{f}": `\\u{f}`,
  "\u{10}": `\\u{10}`,
  "\u{11}": `\\u{11}`,
  "\u{12}": `\\u{12}`,
  "\u{13}": `\\u{13}`,
  "\u{14}": `\\u{14}`,
  "\u{15}": `\\u{15}`,
  "\u{16}": `\\u{16}`,
  "\u{17}": `\\u{17}`,
  "\u{18}": `\\u{18}`,
  "\u{19}": `\\u{19}`,
  "\u{1a}": `\\u{1a}`,
  "\u{1b}": `\\u{1b}`,
  "\u{1c}": `\\u{1c}`,
  "\u{1d}": `\\u{1d}`,
  "\u{1e}": `\\u{1e}`,
  "\u{1f}": `\\u{1f}`,
} as const;

const emitSwiftText = emitTextFactory(
  {
    '"TEXT"': {
      "\\": `\\\\`,
      ...unicode01to09repls,
      "\u{a}": `\\n`,
      ...unicode0Bto1Frepls,
      '"': `\\"`,
    },
    '"""\nTEXT\n"""': {
      "\\": `\\\\`,
      ...unicode01to09repls,
      ...unicode0Bto1Frepls,
      '"""': `\\"""`,
    },
  },
  (x) => `\\u{${x.toString(16)}}`,
);

function binaryPrecedence(opname: string): number {
  switch (opname) {
    case "<<":
    case ">>":
      return 6;
    case "*":
    case "/":
    case "%":
    case "&":
      return 5;
    case "+":
    case "-":
    case "|":
    case "^":
      return 4;
    case "..<":
    case "...":
      return 3.5;
    case "<":
    case "<=":
    case "==":
    case "!=":
    case ">=":
    case ">":
      return 3;
    case "&&":
      return 2;
    case "||":
      return 1;
  }
  if (opname.endsWith("=")) return 0;
  throw new Error(
    `Programming error - unknown Swift binary operator '${opname}.'`,
  );
}

function unaryPrecedence(opname: string): number {
  return 7;
}

export class SwiftEmitter extends PrecedenceVisitorEmitter {
  prec(expr: Node): number {
    switch (expr.kind) {
      case "Prefix":
        return unaryPrecedence(expr.name);
      case "Infix":
        return binaryPrecedence(expr.name);
      case "ConditionalOp":
        return 0;
    }
    return Infinity;
  }

  minPrecForNoParens(parent: Node, fragment: PathFragment) {
    const kind = parent.kind;
    const prop = fragment.prop;
    return prop === "object"
      ? Infinity
      : prop === "collection" &&
          (kind === "IndexCall" || kind === "RangeIndexCall")
        ? Infinity
        : kind === "ConditionalOp"
          ? prop === "condition"
            ? this.prec(parent) + 1
            : prop === "consequent"
              ? -Infinity
              : this.prec(parent)
          : kind === "Infix" || kind === "Prefix" || kind === "Postfix"
            ? this.prec(parent) + (prop === "right" ? 1 : 0)
            : -Infinity;
  }

  visitNoParens(n: Node, spine: Spine, context: CompilationContext) {
    if (n === undefined) return "_";
    switch (n.kind) {
      case "VarDeclarationBlock":
        return ["var", $.children.join(",")];
      case "VarDeclarationWithAssignment":
        return $.assignment;
      case "Block":
        return $.children.join("\n");
      case "Import":
        return [n.name, joinTrees(",", n.modules)];
      case "While":
        return ["while", $.condition, "{", $.body, "}"];
      case "ForEach":
        return [`for`, $.variable, "in", $.collection, "{", $.body, "}"];
      case "If":
        return [
          "if",
          $.condition,
          "{",
          $.consequent,
          "}",
          n.alternate !== undefined ? ["else", "{", $.alternate, "}"] : [],
        ];
      case "Variants":
      case "ForCLike":
        throw new EmitError(n);
      case "Assignment":
        return [$.variable, "=", $.expr];
      case "NamedArg":
        return [n.name, ":", $.value];
      case "Identifier":
        return n.name;
      case "Text":
        return emitSwiftText(n.value, context.options.codepointRange);
      case "Integer":
        return emitIntLiteral(n, { 10: ["", ""], 16: ["0x", ""] });
      case "FunctionCall":
        return [$.func, "(", $.args.join(","), ")"];
      case "PropertyCall":
        return [$.object, ".", $.ident];
      case "MethodCall":
        return [$.object, ".", $.ident, "(", $.args.join(","), ")"];
      case "ConditionalOp":
        return [$.condition, "?", $.consequent, ":", $.alternate];
      case "Infix": {
        return [$.left, n.name, $.right];
      }
      case "Prefix":
        return [n.name, $.arg];
      case "Postfix":
        return [$.arg, n.name];
      case "List":
      case "Table":
        return ["[", $.value.join(","), "]"];
      case "Set":
        return ["Set([", $.value.join(","), "])"];
      case "KeyValue":
        return [$.key, ":", $.value];
      case "IndexCall":
        return [
          $.collection,
          "[",
          $.index,
          "]",
          n.collection.kind === "Table" ? "!" : "",
        ];
      case "RangeIndexCall":
        return [$.collection, "[", $.low, "..<", $.high, "]"];

      default:
        throw new EmitError(n);
    }
  }

  // Custom detokenizer reflects Swift's whitespace rules, namely binary ops needing equal amount of whitespace on both sides
  detokenize(tokens: Token[]): string {
    function isAlphaNum(s: string): boolean {
      return /[A-Za-z0-9]/.test(s);
    }

    // Tokens that need whitespace on both sides:
    //   A binary op followed by a unary op
    //   `!=`
    //   `&` followed by any of `*+-` (without space they are interpreted together as an overflow operator)
    function needsWhiteSpaceOnBothSides(
      token: string,
      nextToken: string,
    ): boolean {
      return (
        (/^[-+*%/<>=^*|~]+$/.test(token) && /[-~]/.test(nextToken[0])) ||
        (token === `&` && /[*+-]/.test(nextToken[0])) ||
        token === `!=`
      );
    }

    function needsWhiteSpace(prevToken: string, token: string): boolean {
      return (
        (isAlphaNum(prevToken[prevToken.length - 1]) && isAlphaNum(token[0])) ||
        ([`if`, `in`, `while`].includes(prevToken) && token[0] !== `(`) ||
        token[0] === `?` ||
        needsWhiteSpaceOnBothSides(prevToken, token)
      );
    }

    let result = tokens[0];
    for (let i = 1; i < tokens.length; i++) {
      if (
        needsWhiteSpace(tokens[i - 1], tokens[i]) ||
        (i + 1 < tokens.length &&
          needsWhiteSpaceOnBothSides(tokens[i], tokens[i + 1]))
      )
        result += " ";
      result += tokens[i];
    }
    return result.trim();
  }
}
