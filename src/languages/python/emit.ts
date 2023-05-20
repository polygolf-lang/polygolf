import { TokenTree } from "@/common/Language";
import {
  containsMultiExpr,
  EmitError,
  emitStringLiteral,
  joinTrees,
} from "../../common/emit";
import { IR, isIntLiteral } from "../../IR";

function precedence(expr: IR.Expr): number {
  switch (expr.kind) {
    case "UnaryOp":
      return unaryPrecedence(expr.name);
    case "BinaryOp":
      return binaryPrecedence(expr.name);
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
      return 4;
    case "and":
      return 2;
    case "or":
      return 1;
  }
  throw new Error(
    `Programming error - unknown Python binary operator '${opname}'.`
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
    `Programming error - unknown Python unary operator '${opname}.'`
  );
}

export default function emitProgram(program: IR.Program): TokenTree {
  return emitMultiExpr(program.body, true);
}

function emitMultiExpr(baseExpr: IR.Expr, isRoot = false): TokenTree {
  const children = baseExpr.kind === "Block" ? baseExpr.children : [baseExpr];
  // Prefer newlines over semicolons at top level for aesthetics
  if (isRoot) {
    return joinExprs("\n", children);
  }
  if (containsMultiExpr(children)) {
    return ["$INDENT$", "\n", joinExprs("\n", children), "$DEDENT$"];
  }
  return joinExprs(";", children);
}

function joinExprs(
  delim: TokenTree,
  exprs: readonly IR.Expr[],
  minPrec = -Infinity
) {
  return joinTrees(
    delim,
    exprs.map((x) => emit(x, minPrec))
  );
}

/**
 * Emits the expression.
 * @param expr The expression to be emited.
 * @param minimumPrec Minimum precedence this expression must be to not need parens around it.
 * @returns  Token tree corresponding to the expression.
 */
function emit(expr: IR.Expr, minimumPrec = -Infinity): TokenTree {
  const prec = precedence(expr);
  function emitNoParens(e: IR.Expr): TokenTree {
    switch (e.kind) {
      case "Block":
        return emitMultiExpr(expr);
      case "ImportStatement":
        return [e.name, joinTrees(",", e.modules)];
      case "WhileLoop":
        return [`while`, emit(e.condition), ":", emitMultiExpr(e.body)];
      case "ForEach":
        return [
          `for`,
          emit(e.variable),
          "in",
          emit(e.collection),
          ":",
          emitMultiExpr(e.body),
        ];
      case "ForRange": {
        const start = emit(e.start);
        const start0 = isIntLiteral(e.start, 0n);
        const end = emit(e.end);
        const increment = emit(e.increment);
        const increment1 = isIntLiteral(e.increment, 1n);
        return [
          "for",
          emit(e.variable),
          "in",
          "range",
          "(",
          start0 && increment1 ? [] : [start, ","],
          end,
          increment1 ? [] : [",", increment],
          ")",
          ":",
          emitMultiExpr(e.body),
        ];
      }
      case "IfStatement":
        return [
          "if",
          emit(e.condition),
          ":",
          emitMultiExpr(e.consequent),
          e.alternate === undefined
            ? []
            : e.alternate.kind === "IfStatement"
            ? ["\n", "el", "$GLUE$", emit(e.alternate)]
            : ["\n", "else", ":", emitMultiExpr(e.alternate)],
        ];
      case "Variants":
      case "ForEachKey":
      case "ForEachPair":
      case "ForCLike":
        throw new EmitError(expr);
      case "Assignment":
        return [emit(e.variable), "=", emit(e.expr)];
      case "ManyToManyAssignment":
        return [joinExprs(",", e.variables), "=", joinExprs(",", e.exprs)];
      case "OneToManyAssignment":
        return [e.variables.map((v) => [emit(v), "="]), emit(e.expr)];
      case "MutatingBinaryOp":
        return [emit(e.variable), e.name + "=", emit(e.right)];
      case "NamedArg":
        return [e.name, "=", emit(e.value)];
      case "Identifier":
        return e.name;
      case "StringLiteral":
        return emitPythonStringLiteral(e.value);
      case "IntegerLiteral":
        return e.value.toString();
      case "FunctionCall":
        return [e.ident.name, "(", joinExprs(",", e.args), ")"];
      case "MethodCall":
        return [
          emit(e.object),
          ".",
          e.ident.name,
          "(",
          joinExprs(",", e.args),
          ")",
        ];
      case "BinaryOp": {
        const rightAssoc = e.name === "**";
        return [
          emit(e.left, prec + (rightAssoc ? 1 : 0)),
          e.name,
          emit(e.right, prec + (rightAssoc ? 0 : 1)),
        ];
      }
      case "UnaryOp":
        return [e.name, emit(e.arg, prec)];
      case "ListConstructor":
        return ["[", joinExprs(",", e.exprs), "]"];
      case "TableConstructor":
        return [
          "{",
          joinTrees(
            ",",
            e.kvPairs.map((x) => [emit(x.key), ":", emit(x.value)])
          ),
          "}",
        ];
      case "IndexCall":
        if (e.oneIndexed) throw new EmitError(expr, "one indexed");
        return [emit(e.collection, Infinity), "[", emit(e.index), "]"];
      case "RangeIndexCall": {
        if (e.oneIndexed) throw new EmitError(expr, "one indexed");
        const low = emit(e.low);
        const low0 = isIntLiteral(e.low, 0n);
        const high = emit(e.high);
        const step = emit(e.step);
        const step1 = isIntLiteral(e.step, 1n);
        return [
          emit(e.collection, Infinity),
          "[",
          ...(low0 ? [] : low),
          ":",
          high,
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

export function emitPythonStringLiteral(x: string): string {
  return emitStringLiteral(x, [
    [
      `"`,
      [
        [`\\`, `\\\\`],
        [`\n`, `\\n`],
        [`\r`, `\\r`],
        [`"`, `\\"`],
      ],
    ],
    [
      `'`,
      [
        [`\\`, `\\\\`],
        [`\n`, `\\n`],
        [`\r`, `\\r`],
        [`'`, `\\'`],
      ],
    ],
    [
      `"""`,
      [
        [`\\`, `\\\\`],
        [`"""`, `\\"""`],
      ],
    ],
  ]);
}
