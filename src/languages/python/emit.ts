import { TokenTree } from "@/common/Language";
import {
  containsMultiExpr,
  EmitError,
  emitStringLiteral,
  joinTrees,
} from "../../common/emit";
import { associativity, IR, isIntLiteral } from "../../IR";

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
    `Programming error - unknown Python binary operator '${opname}.'`
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
    return joinTrees(children.map(emit), "\n");
  }
  if (containsMultiExpr(children)) {
    return ["$INDENT$", children.map((stmt) => ["\n", emit(stmt)]), "$DEDENT$"];
  }
  return joinTrees(children.map(emit), ";");
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
        return [e.name, joinTrees([...e.modules], ",")];
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
        const low = emit(e.low);
        const low0 = isIntLiteral(e.low, 0n);
        const high = emit(e.high);
        const increment = emit(e.increment);
        const increment1 = isIntLiteral(e.increment, 1n);
        return [
          "for",
          emit(e.variable),
          "in",
          "range",
          "(",
          low0 && increment1 ? [] : [low, ","],
          high,
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
          e.alternate !== undefined
            ? ["\n", "else", ":", emitMultiExpr(e.alternate)]
            : [],
        ];
      case "Variants":
      case "ForEachKey":
      case "ForEachPair":
      case "ForCLike":
        throw new EmitError(expr);
      case "Assignment":
        return [emit(e.variable), "=", emit(e.expr)];
      case "ManyToManyAssignment":
        return [
          joinTrees(e.variables.map(emit), ","),
          "=",
          joinTrees(e.exprs.map(emit), ","),
        ];
      case "OneToManyAssignment":
        return [e.variables.map((v) => [emit(v), "="]), emit(e.expr)];
      case "MutatingBinaryOp":
        return [emit(e.variable), e.name + "=", emit(e.right)];
      case "Identifier":
        return e.name;
      case "StringLiteral":
        return emitPythonStringLiteral(e.value);
      case "IntegerLiteral":
        return e.value.toString();
      case "FunctionCall":
        return [e.ident.name, "(", joinTrees(e.args.map(emit), ","), ")"];
      case "MethodCall":
        return [
          emit(e.object),
          ".",
          e.ident.name,
          "(",
          joinTrees(e.args.map(emit), ","),
          ")",
        ];
      case "BinaryOp": {
        const assoc = associativity(e.op);
        return [
          emit(e.left, prec + (assoc === "right" ? 1 : 0)),
          e.name,
          emit(e.right, prec + (assoc === "left" ? 1 : 0)),
        ];
      }
      case "UnaryOp":
        return [e.name, emit(e.arg, prec + 1)];
      case "ListConstructor":
        return ["[", joinTrees(e.exprs.map(emit), ","), "]"];
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
