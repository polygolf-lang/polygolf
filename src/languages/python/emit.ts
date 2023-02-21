import { TokenTree } from "@/common/Language";
import {
  containsMultiExpr,
  EmitError,
  emitStringLiteral,
  joinTrees,
  needsParensPrecedence,
} from "../../common/emit";
import { PathFragment } from "../../common/fragments";
import { IR } from "../../IR";

export default function emitProgram(program: IR.Program): TokenTree {
  return emitStatement(program.body, program);
}

function emitMultiExpr(baseExpr: IR.Expr, parent: IR.Node): TokenTree {
  const children = baseExpr.kind === "Block" ? baseExpr.children : [baseExpr];
  // Prefer newlines over semicolons at top level for aesthetics
  if (parent.kind === "Program") {
    return joinTrees(
      children.map((stmt) => emitStatement(stmt, baseExpr)),
      "\n"
    );
  }
  if (containsMultiExpr(children)) {
    return [
      "$INDENT$",
      children.map((stmt) => ["\n", emitStatement(stmt, baseExpr)]),
      "$DEDENT$",
    ];
  }
  return joinTrees(
    children.map((stmt) => emitStatement(stmt, baseExpr)),
    ";"
  );
}

function emitStatement(stmt: IR.Expr, parent: IR.Node): TokenTree {
  switch (stmt.kind) {
    case "Block":
      return emitMultiExpr(stmt, parent);
    case "ImportStatement":
      return [
        stmt.name,
        joinTrees(
          stmt.modules.map((x) => [x]),
          ","
        ),
      ];
    case "WhileLoop":
      return [
        `while`,
        emitExpr(stmt.condition, stmt),
        ":",
        emitMultiExpr(stmt.body, stmt),
      ];
    case "ForEach":
      return [
        `for`,
        emitExpr(stmt.variable, stmt),
        "in",
        emitExpr(stmt.collection, stmt),
        ":",
        emitMultiExpr(stmt.body, stmt),
      ];
    case "ForRange": {
      const low = emitExpr(stmt.low, stmt);
      const low0 = low.length === 1 && low[0] === "0";
      const high = emitExpr(stmt.high, stmt);
      const increment = emitExpr(stmt.increment, stmt);
      const increment1 = increment.length === 1 && increment[0] === "1";
      return [
        "for",
        emitExpr(stmt.variable, stmt),
        "in",
        "range",
        "(",
        low0 && increment1 ? [] : [low, ","],
        high,
        increment1 ? [] : [",", ...increment],
        ")",
        ":",
        emitMultiExpr(stmt.body, stmt),
      ];
    }
    case "IfStatement":
      return [
        "if",
        emitExpr(stmt.condition, stmt),
        ":",
        emitMultiExpr(stmt.consequent, stmt),
        stmt.alternate !== undefined
          ? ["\n", "else", ":", ...emitMultiExpr(stmt.alternate, stmt)]
          : [],
      ];
    case "Variants":
    case "ForEachKey":
    case "ForEachPair":
    case "ForCLike":
      throw new EmitError(stmt);
    default:
      return emitExpr(stmt, parent);
  }
}

function emitExpr(
  expr: IR.Expr,
  parent: IR.Node,
  fragment?: PathFragment
): TokenTree {
  const inner = emitExprNoParens(expr);
  return needsParens(expr, parent, fragment) ? ["(", inner, ")"] : inner;
}

/**
 * Does expr need parens around it to override precedence?
 * This does not include needing parens for stuff like function calls
 */
function needsParens(
  expr: IR.Expr,
  parent: IR.Node,
  fragment?: PathFragment
): boolean {
  if (needsParensPrecedence(expr, parent, fragment)) {
    return true;
  }
  if (parent.kind === "MethodCall" && fragment === "object") {
    return expr.kind === "UnaryOp" || expr.kind === "BinaryOp";
  }
  return false;
}

function emitExprNoParens(expr: IR.Expr): TokenTree {
  switch (expr.kind) {
    case "Assignment":
      return [emitExpr(expr.variable, expr), "=", emitExpr(expr.expr, expr)];
    case "ManyToManyAssignment":
      return [
        joinTrees(
          expr.variables.map((v) => emitExprNoParens(v)),
          ","
        ),
        "=",
        joinTrees(
          expr.exprs.map((x) => emitExprNoParens(x)),
          ","
        ),
      ];
    case "OneToManyAssignment":
      return [
        expr.variables.map((v) => [emitExprNoParens(v), "="]),
        emitExprNoParens(expr.expr),
      ];
    case "MutatingBinaryOp":
      return [
        emitExpr(expr.variable, expr),
        expr.name + "=",
        emitExpr(expr.right, expr),
      ];
    case "Identifier":
      return expr.name;
    case "StringLiteral":
      return emitPythonStringLiteral(expr.value);
    case "IntegerLiteral":
      return expr.value.toString();
    case "FunctionCall":
      return [
        expr.ident.name,
        "(",
        joinTrees(
          expr.args.map((arg) => emitExpr(arg, expr)),
          ","
        ),
        ")",
      ];
    case "MethodCall":
      return [
        emitExpr(expr.object, expr),
        ".",
        expr.ident.name,
        "(",
        joinTrees(
          expr.args.map((arg) => emitExpr(arg, expr)),
          ","
        ),
        ")",
      ];
    case "BinaryOp":
      return [
        emitExpr(expr.left, expr, "left"),
        expr.name,
        emitExpr(expr.right, expr, "right"),
      ];
    case "UnaryOp":
      return [expr.name, ...emitExpr(expr.arg, expr)];
    case "ListConstructor":
      return [
        "[",
        joinTrees(
          expr.exprs.map((x) => emitExprNoParens(x)),
          ","
        ),
        "]",
      ];
    case "IndexCall":
      if (expr.oneIndexed) throw new EmitError(expr, "one indexed");
      return [
        emitExprNoParens(expr.collection),
        "[",
        emitExprNoParens(expr.index),
        "]",
      ];
    case "RangeIndexCall": {
      if (expr.oneIndexed) throw new EmitError(expr, "one indexed");
      const low = emitExpr(expr.low, expr);
      const low0 = low.length === 1 && low[0] === "0";
      const high = emitExpr(expr.high, expr);
      const step = emitExpr(expr.step, expr);
      const step1 = step.length === 1 && step[0] === "1";
      return [
        emitExprNoParens(expr.collection),
        "[",
        ...(low0 ? [] : low),
        ":",
        high,
        step1 ? [] : [":", ...step],
        "]",
      ];
    }
    case "ImportStatement":
      return ["import", joinTrees([...expr.modules], ",")];
    default:
      throw new EmitError(expr);
  }
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
