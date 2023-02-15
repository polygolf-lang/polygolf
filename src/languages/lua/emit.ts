import { PathFragment } from "../../common/fragments";
import {
  emitStringLiteral,
  joinTrees,
  needsParensPrecedence,
} from "../../common/emit";
import { IR } from "../../IR";
import { TokenTree } from "@/common/Language";

export default function emitProgram(program: IR.Program): TokenTree {
  return emitStatement(program.body, program);
}

function emitBlock(block: IR.Block): TokenTree {
  return joinTrees(
    block.children.map((stmt) => emitStatement(stmt, block)),
    "\n"
  );
}

function emitStatement(stmt: IR.Expr, parent: IR.Node): TokenTree {
  switch (stmt.kind) {
    case "Block":
      return emitBlock(stmt);
    case "WhileLoop":
      return [
        `while`,
        emitExpr(stmt.condition, stmt),
        "do",
        emitStatement(stmt.body, stmt),
        "end",
      ];
    case "ManyToManyAssignment":
      return [
        joinTrees(
          stmt.variables.map((x) => emitExprNoParens(x)),
          ","
        ),
        "=",
        joinTrees(stmt.exprs.map(emitExprNoParens), ","),
      ];
    case "ForRange": {
      if (!stmt.inclusive) throw new Error("Lua requires inclusive ForRange");
      let increment = [",", emitExpr(stmt.increment, stmt)];
      if (
        stmt.increment.kind === "IntegerLiteral" &&
        stmt.increment.value === 1n
      ) {
        increment = [];
      }
      return [
        "for",
        emitExpr(stmt.variable, stmt),
        "=",
        emitExpr(stmt.low, stmt),
        ",",
        emitExpr(stmt.high, stmt),
        increment,
        "do",
        emitStatement(stmt.body, stmt),
        "end",
      ];
    }
    case "IfStatement":
      return [
        "if",
        emitExpr(stmt.condition, stmt),
        "then",
        emitStatement(stmt.consequent, stmt),
        stmt.alternate !== undefined
          ? ["else", emitStatement(stmt.alternate, stmt)]
          : [],
        "end",
      ];
    case "Variants":
      throw new Error("Variants should have been instantiated.");
    case "ForEach":
    case "ForEachKey":
    case "ForEachPair":
    case "ForCLike":
      throw new Error(`Unexpected node (${stmt.kind}) while emitting Lua`);
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
  if (
    parent.kind === "MethodCall" &&
    expr === parent.object &&
    expr.kind !== "Identifier" &&
    expr.kind !== "IndexCall"
  )
    return true;
  return false;
}

function emitExprNoParens(expr: IR.Expr): TokenTree {
  switch (expr.kind) {
    case "Assignment":
      return [emitExpr(expr.variable, expr), "=", emitExpr(expr.expr, expr)];
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
          [`[[`, `]]`],
          [
            [`[[`, null],
            [`]]`, null],
          ],
        ],
      ]);
    case "IntegerLiteral":
      return [expr.value.toString()];
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
        ":",
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
      return [expr.name, emitExpr(expr.arg, expr)];
    case "IndexCall":
      if (!expr.oneIndexed)
        throw new Error("Lua only supports one indexed access.");
      return [
        emitExpr(expr.collection, expr),
        "[",
        emitExpr(expr.index, expr),
        "]",
      ];
    case "ListConstructor":
    case "ArrayConstructor":
      return ["{", joinTrees(expr.exprs.map(emitExprNoParens), ","), "}"];

    default:
      throw new Error(
        `Unexpected node while emitting Lua: ${expr.kind}: ${String(
          "op" in expr ? expr.op : ""
        )}. `
      );
  }
}
