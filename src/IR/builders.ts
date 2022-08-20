import { IR } from ".";

export function program(block: IR.Block, imports: IR.Import[] = [], varDeclarations: IR.VarDeclaration[] = []): IR.Program {
  return { type: "Program", block, imports, varDeclarations };
}

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

export function functionCall(func: string, args: IR.Expr[]): IR.FunctionCall {
  return { type: "FunctionCall", func, args };
}

export function methodCall(
  object: IR.Expr,
  method: string,
  args: IR.Expr[]
): IR.MethodCall {
  return { type: "MethodCall", method, object, args };
}

export function binaryOp(
  op: string,
  left: IR.Expr,
  right: IR.Expr
): IR.BinaryOp {
  return { type: "BinaryOp", op, left, right };
}

export function unaryOp(op: string, arg: IR.Expr): IR.UnaryOp {
  return { type: "UnaryOp", op, arg };
}

export function arrayGet(array: IR.Expr, index: IR.Expr): IR.ArrayGet {
  return { type: "ArrayGet", array, index };
}
