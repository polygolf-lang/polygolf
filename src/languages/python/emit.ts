import { charLength } from "../../common/strings";
import {
  defaultDetokenizer,
  PrecedenceVisitorEmitter,
  type Token,
} from "../../common/Language";
import {
  containsMultiNode,
  emitIntLiteral,
  emitTextFactory,
  getIfChain,
  joinTrees,
} from "../../common/emit";
import { isInt, isText, id, type Node, type If } from "../../IR";
import { type CompilationContext } from "../../common/compile";
import { $, type PathFragment } from "../../common/fragments";
import { type Spine } from "../../common/Spine";
import { InvariantError, NotImplementedError } from "../../common/errors";

export const emitPythonText = emitTextFactory(
  {
    '"TEXT"': { "\\": "\\\\", "\n": "\\n", "\r": "\\r", '"': `\\"` },
    "'TEXT'": { "\\": `\\\\`, "\n": `\\n`, "\r": `\\r`, "'": `\\'` },
    '"""TEXT"""': { "\\": "\\\\", '"""': '\\"""' },
  },
  function (x: number) {
    if (x < 128) return `\\x${x.toString(16).padStart(2, "0")}`;
    if (x < 1 << 16) return `\\u${x.toString(16).padStart(4, "0")}`;
    return `\\U${x.toString(16).padStart(8, "0")}`;
  },
);

function binaryPrecedence(opname: string): number {
  switch (opname) {
    case "**":
      return 12;
    case "":
      return 11.5; // Used in Coconut
    case "*":
    case "//":
    case "%":
      return 10;
    case "+":
    case "-":
      return 9;
    case "<<":
    case ">>":
      return 8;
    case "&":
      return 7;
    case "^":
      return 6;
    case "|":
      return 5;
    case "`":
      return 4.6; // Used in Coconut
    case "|>":
      return 4.5; // Used in Coconut
    case "<":
    case "<=":
    case "==":
    case "!=":
    case ">=":
    case ">":
    case "in":
      return 4;
    case "and":
      return 2;
    case "or":
      return 1;
  }
  if (opname.endsWith("=")) return 0;
  throw new InvariantError(`Unknown Python binary operator '${opname}'.`);
}

function unaryPrecedence(opname: string): number {
  switch (opname) {
    case "-":
    case "~":
      return 11;
    case "not":
      return 3;
  }
  throw new InvariantError(`Unknown Python unary operator '${opname}.'`);
}

export class PythonEmitter extends PrecedenceVisitorEmitter {
  detokenize(x: Token[], context: CompilationContext) {
    return defaultDetokenizer((a, b) => {
      a = a[a.length - 1];
      b = b[0];
      if (a === "0" && /[box]/.test(b)) return true;
      if (/\d/.test(a) && /[a-zA-Z]/.test(b)) return false;
      return /\w/.test(a) && /\w/.test(b);
    })(x);
  }

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
          ? this.prec(parent) + (prop === "alternate" ? 0 : 1)
          : kind === "Infix"
            ? this.infixChildPrecForNoParens(parent, fragment, "**")
            : kind === "Prefix" || kind === "Postfix"
              ? this.prec(parent)
              : -Infinity;
  }

  visitNoParens(n: Node, spine: Spine, context: CompilationContext) {
    function multiNode(child: Spine | PathFragment) {
      if ("prop" in child) child = spine.getChild(child);
      const children =
        child.node.kind === "Block" ? child.node.children : [child.node];
      return containsMultiNode(children)
        ? ["$INDENT$", "\n", child, "$DEDENT$"]
        : child;
    }
    switch (n.kind) {
      case "Cast":
        if (n.targetType === "list") {
          return ["[*", $.expr, "]"];
        }
        if (n.targetType === "set") {
          return ["{*", $.expr, "}"];
        }
        throw new InvariantError(
          `Unsuported cast target type ${n.targetType}.`,
        );
      case "Block":
        return $.children.join(
          spine.isRoot || containsMultiNode(n.children) ? "\n" : ";",
        );
      case "Import":
        return [n.name, joinTrees(",", n.modules)];
      case "While":
        return [`while`, $.condition, ":", multiNode($.body)];
      case "ForEach":
        return [
          `for`,
          (n.variable ?? id("_")).name,
          "in",
          $.collection,
          ":",
          multiNode($.body),
        ];
      case "If": {
        const { ifs, alternate } = getIfChain(spine as Spine<If>);
        return [
          ifs.map((x, i) => [
            i < 1 ? "if" : ["\n", "elif"],
            x.condition,
            ":",
            multiNode(x.consequent),
          ]),
          alternate === undefined
            ? []
            : ["\n", "else", ":", multiNode(alternate)],
        ];
      }
      case "Assignment":
        return [$.variable, "=", $.expr];
      case "ManyToManyAssignment":
        return [$.variables.join(","), "=", $.exprs.join(",")];
      case "OneToManyAssignment":
        return [$.variables.join("="), "=", $.expr];
      case "NamedArg":
        return [n.name, "=", $.value];
      case "Identifier":
      case "Builtin":
        return n.name;
      case "Text":
        return emitPythonText(n.value, context.options.codepointRange);
      case "Integer":
        return emitIntLiteral(n, {
          10: ["", ""],
          16: ["0x", ""],
          36: ["int('", "',36)"],
        });
      case "ConditionalOp":
        return [$.consequent, "if", $.condition, "else", $.alternate];
      case "FunctionCall":
        return [
          $.func,
          "(",
          n.args.length > 1 &&
          n.args.every(isText()) &&
          n.args.every((x) => charLength(x.value) === 1)
            ? [
                "*",
                emitPythonText(
                  n.args.map((x) => x.value).join(""),
                  context.options.codepointRange,
                ),
              ]
            : $.args.join(","),
          ")",
        ];
      case "PropertyCall":
        return [$.object, ".", n.name];
      case "Infix":
        return $.args.join(n.name);
      case "Prefix":
        return [n.name, $.arg];
      case "Set":
      case "Table":
        return ["{", $.value.join(","), "}"];
      case "List":
        return ["[", $.value.join(","), "]"];
      case "KeyValue":
        return [$.key, ":", $.value];
      case "IndexCall":
        return [$.collection, "[", $.index, "]"];
      case "RangeIndexCall": {
        const low0 = isInt(0n)(n.low);
        const high0 = isInt(0n)(n.high);
        const step1 = isInt(1n)(n.step);
        return [
          $.collection,
          "[",
          low0 ? [] : $.low,
          ":",
          high0 ? [] : $.high,
          step1 ? [] : [":", $.step],
          "]",
        ];
      }
      default:
        throw new NotImplementedError(n);
    }
  }
}
