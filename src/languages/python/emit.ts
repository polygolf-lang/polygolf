import {
  emitStringLiteral,
  hasChildWithBlock,
  joinGroups,
  needsParensPrecedence,
} from "../../common/emit";
import { PathFragment } from "../../common/fragments";
import { IR } from "../../IR";

export default function emitProgram(program: IR.Program): string[] {
  return emitStatement(program.body, program);
}

function emitBlock(block: IR.Expr, parent: IR.Node): string[] {
  const children = block.kind === "Block" ? block.children : [block];
  if (hasChildWithBlock(block)) {
    if (parent.kind === "Program") {
      return joinGroups(
        children.map((stmt) => emitStatement(stmt, block)),
        "\n"
      );
    }
    return [
      "$INDENT$",
      "\n",
      ...joinGroups(
        children.map((stmt) => emitStatement(stmt, block)),
        "\n"
      ),
      "$DEDENT$",
      "\n",
    ];
  }
  return joinGroups(
    children.map((stmt) => emitStatement(stmt, block)),
    ";"
  );
}

function emitStatement(stmt: IR.Expr, parent: IR.Node): string[] {
  switch (stmt.kind) {
    case "Block":
      return emitBlock(stmt, parent);
    case "ImportStatement":
      return [
        stmt.name,
        ...joinGroups(
          stmt.modules.map((x) => [x]),
          ","
        ),
      ];
    case "WhileLoop":
      return [
        `while`,
        ...emitExpr(stmt.condition, stmt),
        ":",
        ...emitBlock(stmt.body, stmt),
      ];
    case "ForRange": {
      const low = emitExpr(stmt.low, stmt);
      const low0 = low.length === 1 && low[0] === "0";
      const high = emitExpr(stmt.high, stmt);
      const increment = emitExpr(stmt.increment, stmt);
      const increment1 = increment.length === 1 && increment[0] === "1";
      return [
        "for",
        ...emitExpr(stmt.variable, stmt),
        "in",
        "range",
        "(",
        ...(low0 && increment1 ? [] : [...low, ","]),
        ...high,
        ...(increment1 ? [] : [",", ...increment]),
        ")",
        ":",
        ...emitBlock(stmt.body, stmt),
      ];
    }
    case "IfStatement":
      return [
        "if",
        ...emitExpr(stmt.condition, stmt),
        ":",
        ...emitBlock(stmt.consequent, stmt),
        ...(stmt.alternate !== undefined
          ? ["\n", "else", ":", ...emitBlock(stmt.alternate, stmt)]
          : []),
      ];
    case "Variants":
      throw new Error("Variants should have been instantiated.");
    case "ForEach":
    case "ForEachKey":
    case "ForEachPair":
    case "ForCLike":
      throw new Error(`Unexpected node (${stmt.kind}) while emitting Python`);
    default:
      return emitExpr(stmt, parent);
  }
}

function emitExpr(
  expr: IR.Expr,
  parent: IR.Node,
  fragment?: PathFragment
): string[] {
  const inner = emitExprNoParens(expr);
  return needsParens(expr, parent, fragment) ? ["(", ...inner, ")"] : inner;
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

function emitExprNoParens(expr: IR.Expr): string[] {
  switch (expr.kind) {
    case "Assignment":
      return [
        ...emitExpr(expr.variable, expr),
        "=",
        ...emitExpr(expr.expr, expr),
      ];
    case "ManyToManyAssignment":
      return [
        ...joinGroups(
          expr.variables.map((v) => emitExprNoParens(v)),
          ","
        ),
        "=",
        ...joinGroups(
          expr.exprs.map((x) => emitExprNoParens(x)),
          ","
        ),
      ];
    case "MutatingBinaryOp":
      return [
        ...emitExpr(expr.variable, expr),
        expr.name + "=",
        ...emitExpr(expr.right, expr),
      ];
    case "Identifier":
      return [expr.name];
    case "StringLiteral":
      return emitStringLiteral(expr.value, [
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
    case "IntegerLiteral":
      return [expr.value.toString()];
    case "FunctionCall":
      return [
        expr.ident.name,
        "(",
        ...joinGroups(
          expr.args.map((arg) => emitExpr(arg, expr)),
          ","
        ),
        ")",
      ];
    case "MethodCall":
      return [
        ...emitExpr(expr.object, expr),
        ".",
        expr.ident.name,
        "(",
        ...joinGroups(
          expr.args.map((arg) => emitExpr(arg, expr)),
          ","
        ),
        ")",
      ];
    case "BinaryOp":
      return [
        ...emitExpr(expr.left, expr, "left"),
        expr.name,
        ...emitExpr(expr.right, expr, "right"),
      ];
    case "UnaryOp":
      return [expr.name, ...emitExpr(expr.arg, expr)];
    case "ListConstructor":
      return [
        "[",
        ...joinGroups(
          expr.exprs.map((x) => emitExprNoParens(x)),
          ","
        ),
        "]",
      ];
    case "IndexCall":
      if (expr.oneIndexed)
        throw new Error("Python only supports zeroIndexed access.");
      return [
        ...emitExprNoParens(expr.collection),
        "[",
        ...emitExprNoParens(expr.index),
        "]",
      ];

    default:
      throw new Error(
        `Unexpected node while emitting Python: ${expr.kind}: ${
          "op" in expr ? expr.op ?? "" : ""
        }. `
      );
  }
}
