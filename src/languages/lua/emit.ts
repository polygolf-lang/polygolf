import { IR } from "../../IR";

export default function emitProgram(program: IR.Program): string {
  return emitBlock(program.block);
}

function emitBlock(block: IR.Block): string {
  return block.children.map((stmt) => emitStatement(stmt, block)).join("\n");
}

function emitStatement(stmt: IR.Statement, parent: IR.Block): string {
  switch (stmt.type) {
    case "WhileLoop":
      return (
        `while ${emitExpr(stmt.condition, stmt)} do\n` +
        emitBlock(stmt.body) +
        `\nend`
      );
    case "ForRange": {
      if (!stmt.inclusive) throw new Error("Lua requires inclusive ForRange");
      let increment = "," + emitExpr(stmt.increment, stmt);
      if (increment === ",1") {
        increment = "";
      }
      return (
        `for ${emitExpr(stmt.variable, stmt)}=${emitExpr(stmt.low, stmt)},` +
        `${emitExpr(stmt.high, stmt)}${increment} do\n` +
        emitBlock(stmt.body) +
        `\nend`
      );
    }
    case "IfStatement":
      return (
        `if ${emitExpr(stmt.condition, stmt)}then\n` +
        emitBlock(stmt.consequent) +
        (stmt.alternate.children.length > 0
          ? "\nelse\n" + emitBlock(stmt.alternate)
          : "") +
        "\nend"
      );
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

function emitExpr(expr: IR.Expr, parent: IR.Node): string {
  const inner = emitExprNoParens(expr);
  return needsParens(expr, parent) ? "(" + inner + ")" : inner;
}

/**
 * Does expr need parens around it to override precedence?
 * This does not include needing parens for stuff like function calls
 */
function needsParens(expr: IR.Expr, parent: IR.Node): boolean {
  if (
    parent.type === "MethodCall" &&
    expr === parent.object &&
    expr.type !== "Identifier" &&
    expr.type !== "ArrayGet"
  )
    return true;
  if (parent.type !== "BinaryOp") return false;
  if (expr.type !== "BinaryOp") return false;
  // over-parenthesizes here
  // TODO: check precedence and stuff
  return true;
}

function emitExprNoParens(expr: IR.Expr): string {
  switch (expr.type) {
    case "Assignment":
      return `${emitExpr(expr.variable, expr)}=${emitExpr(expr.expr, expr)}`;
    case "Identifier":
      return expr.name;
    case "StringLiteral":
      // TODO: special string handling
      return JSON.stringify(expr.value);
    case "IntegerLiteral":
      // TODO: avoid exponential notation e.g. 1e20
      return expr.value.toString();
    case "FunctionCall":
      return (
        expr.name +
        "(" +
        expr.args.map((arg: IR.Expr) => emitExpr(arg, expr)).join(",") +
        ")"
      );
    case "MethodCall":
      return (
        emitExpr(expr.object, expr) +
        ":" +
        expr.name +
        "(" +
        expr.args.map((arg: IR.Expr) => emitExpr(arg, expr)).join(",") +
        ")"
      );
    case "BinaryOp":
      return `${emitExpr(expr.left, expr)}${expr.name}${emitExpr(
        expr.right,
        expr
      )}`;
    case "UnaryOp":
      return `${expr.name}${emitExpr(expr.arg, expr)}`;
    case "ArrayGet":
      return (
        emitExpr(expr.array, expr) + "[" + emitExpr(expr.index, expr) + "]"
      );
    case "StringGetByte":
      return `${emitExpr(expr.string, expr)}:byte(${emitExpr(
        expr.index,
        expr
      )})`;
    case "Print":
      return expr.newline
        ? `print(${emitExpr(expr.value, expr)})`
        : `io.write(${emitExpr(expr.value, expr)})`;
    case "ListConstructor":
      return "{" + expr.exprs.map(emitExprNoParens).join(",") + "}";
    case "ListGet":
      if (expr.oneIndexed)
        return (
          emitExprNoParens(expr.list) + "[" + emitExprNoParens(expr.index) + "]"
        );
      throw new Error("Lua only supports oneIndexed access.");
    default:
      throw new Error(`Unexpected node while emitting Lua: ${expr.type}. `);
  }
}
