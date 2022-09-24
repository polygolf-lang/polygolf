import { IR } from "../../IR";

export default function emitProgram(program: IR.Program): string[] {
  return emitBlock(program.block);
}

function emitBlock(block: IR.Block): string[] {
  if (block.requiresBlock){
    return ["$INDENT$", "\n",...joinGroups(
      block.children.map((stmt) => emitStatement(stmt, block)),
      "\n"
    ), "$DEDENT$", "\n"]
  }
  return joinGroups(
    block.children.map((stmt) => emitStatement(stmt, block)),
    ";"
  );
}

function emitStatement(stmt: IR.Statement, parent: IR.Block): string[] {
  switch (stmt.type) {
    case "WhileLoop":
      return [
        `while`,
        ...emitExpr(stmt.condition, stmt),
        ":",
        ...emitBlock(stmt.body)
      ];
    case "ForRange": {
      const increment = emitExpr(stmt.increment, stmt);
      if (increment.length === 1 && increment[0] === "1") {
        return [
          "for",
          ...emitExpr(stmt.variable, stmt),
          "in",
          ...emitExpr(stmt.low, stmt),
          stmt.inclusive ? ".." : "..<",
          ...emitExpr(stmt.high, stmt),
          ":",
          ...emitBlock(stmt.body),
        ];
      }
      if(!stmt.inclusive){
        throw new Error("Ranges with steps must be inclusive in Nim.");
      }
      return [
        "for",
        ...emitExpr(stmt.variable, stmt),
        "in",
        "countup",
        "(",
        ...emitExpr(stmt.low, stmt),
        ",",
        ...emitExpr(stmt.high, stmt),
        ",",
        ...emitExpr(stmt.increment, stmt),
        ")",
        ":",
        ...emitBlock(stmt.body)
      ];
    }
    case "IfStatement":
      return [
        "if",
        ...emitExpr(stmt.condition, stmt),
        ":",
        ...emitBlock(stmt.consequent),
        ...(stmt.alternate.children.length > 0
          ? ["else",":", ...emitBlock(stmt.alternate)]
          : [])
      ];
    case "Variants":
      throw new Error("Variants should have been instantiated.");
    case "ForEach":
    case "ForEachKey":
    case "ForEachPair":
    case "ForCLike":
      throw new Error(`Unexpected node (${stmt.type}) while emitting Nim`);
    default:
      return emitExpr(stmt, parent);
  }
}

function emitExpr(expr: IR.Expr, parent: IR.Node): string[] {
  const inner = emitExprNoParens(expr);
  return needsParens(expr, parent) ? ["(", ...inner, ")"] : inner;
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

function joinGroups(groups: string[][], ...sep: string[]): string[] {
  return groups.flatMap((x, i) => (i > 0 ? [...sep, ...x] : x));
}

function emitExprNoParens(expr: IR.Expr): string[] {
  switch (expr.type) {
    case "Assignment":
      return [
        ...emitExpr(expr.variable, expr),
        "=",
        ...emitExpr(expr.expr, expr),
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
      // TODO: special string handling
      return [JSON.stringify(expr.value)];
    case "IntegerLiteral":
      return [expr.value.toString()];
    case "FunctionCall":
      return [
        expr.name,
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
        expr.name,
        "(",
        ...joinGroups(
          expr.args.map((arg) => emitExpr(arg, expr)),
          ","
        ),
        ")",
      ];
    case "BinaryOp":
      return [
        ...emitExpr(expr.left, expr),
        expr.name,
        ...emitExpr(expr.right, expr),
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
        "[",
        ...emitExpr(expr.index, expr),
        "]",
      ];
    case "Print":
      return expr.newline
        ? ["echo", "(", ...emitExpr(expr.value, expr), ")"]
        : ["stdout", ".", "write", "(", ...emitExpr(expr.value, expr), ")"];
    case "ListConstructor":
      return ["@", "[", ...joinGroups(expr.exprs.map(emitExprNoParens), ","), "]"];
    case "ListGet":
      if (expr.oneIndexed)
        throw new Error("Nim only supports zeroIndexed access.");
      return [
        ...emitExprNoParens(expr.list),
        "[",
        ...emitExprNoParens(expr.index),
        "]",
      ];

    default:
      throw new Error(`Unexpected node while emitting Nim: ${expr.type}. `);
  }
}
