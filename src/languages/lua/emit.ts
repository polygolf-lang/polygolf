import { PathFragment } from "common/traverse";
import {
  emitStringLiteral,
  joinGroups,
  needsParensPrecedence,
} from "../../common/emit";
import { IR } from "../../IR";

export default function emitProgram(program: IR.Program): string[] {
  return emitBlock(program.block);
}

function emitBlock(block: IR.Block): string[] {
  return joinGroups(
    block.children.map((stmt) => emitStatement(stmt, block)),
    "\n"
  );
}

function emitStatement(stmt: IR.Statement, parent: IR.Block): string[] {
  switch (stmt.type) {
    case "WhileLoop":
      return [
        `while`,
        ...emitExpr(stmt.condition, stmt),
        "do",
        ...emitBlock(stmt.body),
        "end",
      ];
    case "ManyToManyAssignment":
      return [
        ...joinGroups(
          stmt.variables.map((x) => [x.name]),
          ","
        ),
        "=",
        ...joinGroups(stmt.exprs.map(emitExprNoParens), ","),
      ];
    case "ForRange": {
      if (!stmt.inclusive) throw new Error("Lua requires inclusive ForRange");
      let increment = [",", ...emitExpr(stmt.increment, stmt)];
      if (increment.length === 2 && increment[1] === "1") {
        increment = [];
      }
      return [
        "for",
        ...emitExpr(stmt.variable, stmt),
        "=",
        ...emitExpr(stmt.low, stmt),
        ",",
        ...emitExpr(stmt.high, stmt),
        ...increment,
        "do",
        ...emitBlock(stmt.body),
        "end",
      ];
    }
    case "IfStatement":
      return [
        "if",
        ...emitExpr(stmt.condition, stmt),
        "then",
        ...emitBlock(stmt.consequent),
        ...(stmt.alternate.children.length > 0
          ? ["else", ...emitBlock(stmt.alternate)]
          : []),
        "end",
      ];
    case "Variants":
      throw new Error("Variants should have been instantiated.");
    case "ForEach":
    case "ForEachKey":
    case "ForEachPair":
    case "ForCLike":
      throw new Error(`Unexpected node (${stmt.type}) while emitting Lua`);
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
  if (
    parent.type === "MethodCall" &&
    expr === parent.object &&
    expr.type !== "Identifier" &&
    expr.type !== "ArrayGet"
  )
    return true;
  return false;
}

function emitExprNoParens(expr: IR.Expr): string[] {
  switch (expr.type) {
    case "Assignment":
      return [
        ...emitExpr(expr.variable, expr),
        "=",
        ...emitExpr(expr.expr, expr),
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
        ...joinGroups(
          expr.args.map((arg) => emitExpr(arg, expr)),
          ","
        ),
        ")",
      ];
    case "MethodCall":
      return [
        ...emitExpr(expr.object, expr),
        ":",
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
    case "ArrayGet":
      return [
        ...emitExpr(expr.array, expr),
        "[",
        ...emitExpr(expr.index, expr),
        "]",
      ];
    case "StringGetByte":
      return [
        ...emitExpr(expr.string, expr),
        ":",
        "byte",
        "(",
        ...emitExpr(expr.index, expr),
        ")",
      ];
    case "Print":
      return expr.newline
        ? ["print", "(", ...emitExpr(expr.value, expr), ")"]
        : ["io", ".", "write", "(", ...emitExpr(expr.value, expr), ")"];
    case "ListConstructor":
      return ["{", ...joinGroups(expr.exprs.map(emitExprNoParens), ","), "}"];
    case "ListGet":
      if (!expr.oneIndexed)
        throw new Error("Lua only supports oneIndexed access.");
      return [
        ...emitExprNoParens(expr.list),
        "[",
        ...emitExprNoParens(expr.index),
        "]",
      ];

    default:
      throw new Error(`Unexpected node while emitting Lua: ${expr.type}. `);
  }
}
