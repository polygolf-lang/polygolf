import {
  defaultDetokenizer,
  PrecedenceVisitorEmitter,
} from "../../common/Language";
import {
  emitTextFactory,
  joinTrees,
  EmitError,
  emitIntLiteral,
} from "../../common/emit";
import { type Array, isInt, type Node, type Text } from "../../IR";
import { type CompilationContext } from "../../common/compile";
import type { Spine } from "../../common/Spine";
import { $, type PathFragment } from "../../common/fragments";

function escape(x: number, i: number, arr: number[]) {
  if (x < 100 && (i === arr.length - 1 || arr[i + 1] < 48 || arr[i + 1] > 57))
    return `\\${x.toString()}`;
  if (x < 128) return `\\x${x.toString(16).padStart(2, "0")}`;
  if (x < 1 << 16) return `\\u${x.toString(16).padStart(4, "0")}`;
  return `\\u{${x.toString(16)}}`;
}

const emitNimText = emitTextFactory(
  {
    '"TEXT"': { "\\": `\\\\`, "\n": `\\n`, "\r": `\\r`, '"': `\\"` },
    '"""TEXT"""': { '"""': null },
    'r"TEXT"': { '"': `""`, "\n": null, "\r": null },
  },
  escape,
);
const emitNimChar = emitTextFactory(
  {
    "'TEXT'": { "\\": `\\\\`, "\n": `\\n`, "\r": `\\r`, "'": `\\'` },
  },
  escape,
);

function binaryPrecedence(opname: string): number {
  switch (opname) {
    case "":
      return 12;
    case ".":
      return 12;
    case "^":
      return 10;
    case "*":
    case "div":
    case "mod":
    case "%%":
    case "/%":
    case "shl":
    case "shr":
      return 9;
    case "+":
    case "-":
      return 8;
    case "&":
      return 7;
    case "..":
    case "..<":
      return 6;
    case "<":
    case "<=":
    case "==":
    case "!=":
    case ">=":
    case ">":
    case "in":
      return 5;
    case "and":
      return 4;
    case "or":
    case "xor":
      return 3;
    case " ":
      return 1;
  }
  if (opname.endsWith("=")) return 0;
  throw new Error(
    `Programming error - unknown Nim binary operator '${opname}.'`,
  );
}

export class NimEmitter extends PrecedenceVisitorEmitter {
  detokenize = defaultDetokenizer((a, b) => {
    const left = a[a.length - 1];
    const right = b[0];

    if (/[A-Za-z0-9_]/.test(left) && /[A-Za-z0-9_]/.test(right)) return true; // alphanums meeting

    const symbols = "=+-*/<>@$~&%|!?^.:\\";
    if (symbols.includes(left) && symbols.includes(right)) return true; // symbols meeting

    if (
      /[A-Za-z]/.test(left) &&
      ((!["var", "in", "else", "if", "while", "for"].includes(a) &&
        (symbols + `"({[`).includes(right)) ||
        right === `"`) &&
      !["=", ":", ".", "::"].includes(b)
    )
      return true; // identifier meeting an operator or string literal or opening paren

    return false;
  });

  prec(expr: Node): number {
    switch (expr.kind) {
      case "FunctionCall":
        return 12;
      case "Prefix":
        return 11;
      case "Infix":
        return binaryPrecedence(expr.name);
      case "ConditionalOp":
        return -Infinity;
    }
    return Infinity;
  }

  minPrecForNoParens(parent: Node, fragment: PathFragment) {
    const kind = parent.kind;
    const prop = fragment.prop;
    return kind === "ConditionalOp"
      ? 0
      : kind === "Infix"
      ? this.prec(parent) +
        Number(
          (parent.name === "^" || parent.name === " ") === (prop === "left"),
        )
      : kind === "Prefix" || kind === "Postfix"
      ? this.prec(parent)
      : prop === "collection" &&
        (kind === "IndexCall" || kind === "RangeIndexCall")
      ? 12
      : -Infinity;
  }

  visitNoParens(n: Node, spine: Spine, context: CompilationContext) {
    function multiNode(fragment: PathFragment) {
      const child = spine.getChild(fragment);
      const children =
        child.node.kind === "Block" ? child.getChildSpines() : [child];
      let inner = [];
      let needsBlock = false;
      for (const child of children) {
        const needsNewline =
          "consequent" in child.node ||
          ("children" in child.node &&
            (child.node.kind !== "VarDeclarationBlock" ||
              child.node.children.length > 1)) ||
          "body" in child.node;
        needsBlock =
          needsBlock ||
          needsNewline ||
          child.node.kind.startsWith("VarDeclaration");
        inner.push(child);
        inner.push(needsNewline ? "\n" : ";");
      }
      inner = inner.slice(0, -1);
      if (needsBlock) {
        return ["$INDENT$", "\n", inner, "$DEDENT$"];
      }
      return inner;
    }
    switch (n.kind) {
      case "Block":
        return $.children.join("\n");
      case "VarDeclarationWithAssignment":
        return $.assignment;
      case "VarDeclarationBlock":
        if (n.children.length > 1)
          return ["var", "$INDENT$", "\n", $.children.join("\n"), "$DEDENT$"];
        return ["var", $.children.at(0)];
      case "Import":
        return [n.name, joinTrees(",", n.modules)];
      case "While":
        return [`while`, $.condition, ":", $.body];
      case "ForEach":
        return [
          `for`,
          n.variable === undefined ? "()" : $.variable,
          "in",
          $.collection,
          ":",
          multiNode($.body),
        ];
      case "If":
        return [
          "if",
          $.condition,
          ":",
          multiNode($.consequent),
          n.alternate !== undefined
            ? ["else", ":", multiNode($.alternate)]
            : [],
        ];
      case "Variants":
      case "ForCLike":
        throw new EmitError(n);
      case "Assignment":
        return [$.variable, "=", $.expr];
      case "ManyToManyAssignment":
        return ["(", $.variables.join(","), ")=(", $.exprs.join(","), ")"];
      case "OneToManyAssignment":
        return [$.variables.join(","), "=", $.expr];
      case "ConditionalOp":
        return ["if", $.condition, ":", $.consequent, "else", ":", $.alternate];
      case "Identifier":
        return n.name;
      case "Text":
        return (n.targetType === "char" ? emitNimChar : emitNimText)(
          n.value,
          context.options.codepointRange,
        );
      case "Integer":
        return emitIntLiteral(n, { 10: ["", ""], 16: ["0x", ""] });
      case "FunctionCall":
        return [$.func, "$GLUE$", "(", $.args.join(","), ")"];
      case "Infix": {
        if (n.name === "") {
          return [$.left, "$GLUE$", emitAsRawText((n.right as Text).value)];
        }
        return [
          $.left,
          /[A-Za-z]/.test(n.name[0]) ? [] : "$GLUE$",
          n.name,
          $.right,
        ];
      }
      case "Prefix":
        return [n.name, $.arg];
      case "List":
        return ["@", "[", $.value.join(","), "]"];
      case "Array":
        if (n.value.every((x) => x.kind === "Array" && x.value.length === 2)) {
          const pairs = n.value as readonly Array[];
          return [
            "{",
            pairs.map((x, i) => [
              i > 0 ? "," : [],
              spine.getChild($.value.at(i), $.value.at(0)),
              ":",
              spine.getChild($.value.at(i), $.value.at(1)),
            ]),
            "}",
          ];
        }
        return ["[", $.value.join(","), "]"];
      case "Set":
        return ["[", $.value.join(","), "]", ".", "toSet"];
      case "Table":
        return ["{", $.value.join(","), "}", ".", "toTable"];
      case "KeyValue":
        return [$.key, ":", $.value];
      case "IndexCall":
        return [$.collection, "$GLUE$", "[", $.index, "]"];
      case "RangeIndexCall":
        if (!isInt(1n)(n.step)) throw new EmitError(n, "step");
        return [$.collection, "$GLUE$", "[", $.low, "..<", $.high, "]"];
      default:
        throw new EmitError(n);
    }
  }
}

function emitAsRawText(value: string): string {
  return `"${value.replaceAll(`"`, `""`)}"`;
}
