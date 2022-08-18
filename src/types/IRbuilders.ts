import * as IR from "./IR";

export function block(children: IR.Statement[]): IR.Block {
  return { type: "Block", children };
}

export function whileLoop(condition: IR.Expr, body: IR.Block): IR.WhileLoop {
  return { type: "WhileLoop", condition, body };
}

export function ifStatement(
  condition: IR.Expr,
  consequent: IR.Block,
  alternate: IR.Block
): IR.IfStatement {
  return { type: "IfStatement", condition, consequent, alternate };
}

export function assignment(
  variable: IR.Identifier | string,
  expr: IR.Expr
): IR.Assignment {
  return {
    type: "Assignment",
    variable: typeof variable === "string" ? id(variable) : variable,
    expr,
  };
}

export function application(name: IR.Builtin, args: IR.Expr[]): IR.Application {
  return { type: "Application", name, args };
}

export function id(name: string): IR.Identifier {
  return { type: "Identifier", name };
}

export function int(value: BigInt): IR.IntegerLiteral {
  return { type: "IntegerLiteral", value };
}

export function stringLiteral(value: string): IR.StringLiteral {
  return { type: "StringLiteral", value };
}
