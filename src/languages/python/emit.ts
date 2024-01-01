import { charLength } from "../../common/strings";
import { type TokenTree } from "@/common/Language";
import {
  containsMultiNode,
  EmitError,
  emitIntLiteral,
  emitTextFactory,
  joinTrees,
} from "../../common/emit";
import { type IR, isInt, text, isText, id, infix } from "../../IR";
import { type CompilationContext } from "@/common/compile";

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

function precedence(expr: IR.Node): number {
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

function binaryPrecedence(opname: string): number {
  switch (opname) {
    case "**":
      return 12;
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
  throw new Error(
    `Programming error - unknown Python binary operator '${opname}'.`,
  );
}

function unaryPrecedence(opname: string): number {
  switch (opname) {
    case "-":
    case "~":
      return 11;
    case "not":
      return 3;
  }
  throw new Error(
    `Programming error - unknown Python unary operator '${opname}.'`,
  );
}

export default function emitProgram(
  program: IR.Node,
  context: CompilationContext,
): TokenTree {
  function emitMultiNode(BaseNode: IR.Node, isRoot = false): TokenTree {
    const children = BaseNode.kind === "Block" ? BaseNode.children : [BaseNode];
    // Prefer newlines over semicolons at top level for aesthetics
    if (isRoot) {
      return joinNodes("\n", children);
    }
    if (containsMultiNode(children)) {
      return ["$INDENT$", "\n", joinNodes("\n", children), "$DEDENT$"];
    }
    return joinNodes(";", children);
  }

  function joinNodes(
    delim: TokenTree,
    exprs: readonly IR.Node[],
    minPrec = -Infinity,
  ) {
    return joinTrees(
      delim,
      exprs.map((x) => emit(x, minPrec)),
    );
  }

  /**
   * Emits the expression.
   * @param expr The expression to be emited.
   * @param minimumPrec Minimum precedence this expression must be to not need parens around it.
   * @returns  Token tree corresponding to the expression.
   */
  function emit(expr: IR.Node, minimumPrec = -Infinity): TokenTree {
    const prec = precedence(expr);
    function emitNoParens(e: IR.Node): TokenTree {
      switch (e.kind) {
        case "Block":
          return emitMultiNode(expr);
        case "Import":
          return [e.name, joinTrees(",", e.modules)];
        case "While":
          return [`while`, emit(e.condition), ":", emitMultiNode(e.body)];
        case "ForEach":
          return [
            `for`,
            emit(e.variable),
            "in",
            emit(e.collection),
            ":",
            emitMultiNode(e.body),
          ];
        case "ForRange": {
          const start = emit(e.start);
          const start0 = isInt(0n)(e.start);
          const end = emit(e.end);
          const increment = emit(e.increment);
          const increment1 = isInt(1n)(e.increment);
          return e.variable === undefined && start0 && increment1
            ? [
                "for",
                "_",
                "in",
                emit(infix("*", text("X"), e.end)),
                ":",
                emitMultiNode(e.body),
              ]
            : [
                "for",
                emit(e.variable ?? id("_")),
                "in",
                "range",
                "(",
                start0 && increment1 ? [] : [start, ","],
                end,
                increment1 ? [] : [",", increment],
                ")",
                ":",
                emitMultiNode(e.body),
              ];
        }
        case "If":
          return [
            "if",
            emit(e.condition),
            ":",
            emitMultiNode(e.consequent),
            e.alternate === undefined
              ? []
              : e.alternate.kind === "If"
              ? ["\n", "el", "$GLUE$", emit(e.alternate)]
              : ["\n", "else", ":", emitMultiNode(e.alternate)],
          ];
        case "Variants":
        case "ForEachKey":
        case "ForEachPair":
        case "ForCLike":
          throw new EmitError(expr);
        case "Assignment":
          return [emit(e.variable), "=", emit(e.expr)];
        case "ManyToManyAssignment":
          return [joinNodes(",", e.variables), "=", joinNodes(",", e.exprs)];
        case "OneToManyAssignment":
          return [e.variables.map((v) => [emit(v), "="]), emit(e.expr)];
        case "NamedArg":
          return [e.name, "=", emit(e.value)];
        case "Identifier":
          return e.name;
        case "Text":
          return emitPythonText(e.value, context.options.codepointRange);
        case "Integer":
          return emitIntLiteral(e, {
            10: ["", ""],
            16: ["0x", ""],
            36: ["int('", "',36)"],
          });
        case "ConditionalOp":
          return [
            emit(e.consequent, prec + 1),
            "if",
            emit(e.condition, prec + 1),
            "else",
            emit(e.alternate, prec),
          ];
        case "FunctionCall":
          return [
            emit(e.func),
            "(",
            e.args.length > 1 &&
            e.args.every(isText()) &&
            e.args.every((x) => charLength(x.value) === 1)
              ? ["*", emit(text(e.args.map((x) => x.value).join("")))]
              : joinNodes(",", e.args),
            ")",
          ];
        case "PropertyCall":
          return [emit(e.object), ".", emit(e.ident)];
        case "Infix": {
          const rightAssoc = e.name === "**";
          return [
            emit(e.left, prec + (rightAssoc ? 1 : 0)),
            e.name,
            emit(e.right, prec + (rightAssoc ? 0 : 1)),
          ];
        }
        case "Prefix":
          return [e.name, emit(e.arg, prec)];
        case "Set":
          return ["{", joinNodes(",", e.value), "}"];
        case "List":
          return ["[", joinNodes(",", e.value), "]"];
        case "Table":
          return [
            "{",
            joinTrees(
              ",",
              e.value.map((x) => [emit(x.key), ":", emit(x.value)]),
            ),
            "}",
          ];
        case "IndexCall":
          return [emit(e.collection, Infinity), "[", emit(e.index), "]"];
        case "RangeIndexCall": {
          const low = emit(e.low);
          const low0 = isInt(0n)(e.low);
          const high = emit(e.high);
          const high0 = isInt(0n)(e.high);
          const step = emit(e.step);
          const step1 = isInt(1n)(e.step);
          return [
            emit(e.collection, Infinity),
            "[",
            low0 ? [] : low,
            ":",
            high0 ? [] : high,
            step1 ? [] : [":", ...step],
            "]",
          ];
        }
        default:
          throw new EmitError(expr);
      }
    }

    const inner = emitNoParens(expr);
    if (prec >= minimumPrec) return inner;
    return ["(", inner, ")"];
  }
  return emitMultiNode(program, true);
}
