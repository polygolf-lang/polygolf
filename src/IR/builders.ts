import { IR } from ".";

export function program(
  block: IR.Block,
  imports: IR.Import[] = [],
  varDeclarations: IR.VarDeclaration[] = []
): IR.Program {
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

export function mutatingBinaryOp(
  op: string,
  variable: IR.Identifier,
  right: IR.Expr
): IR.MutatingBinaryOp {
  return { type: "MutatingBinaryOp", op, variable, right };
}

export function unaryOp(op: string, arg: IR.Expr): IR.UnaryOp {
  return { type: "UnaryOp", op, arg };
}

export function argv(): IR.Argv {
  return { type: "Argv" };
}

export function varDeclaration(
  variable: IR.Identifier | string,
  variableType: IR.ValueType
): IR.VarDeclaration {
  return {
    type: "VarDeclaration",
    variable: typeof variable === "string" ? id(variable) : variable,
    variableType,
  };
}

export function arrayConstructor(exprs: IR.Expr[]): IR.ArrayConstructor {
  return { type: "ArrayConstructor", exprs };
}

export function listConstructor(exprs: IR.Expr[]): IR.ListConstructor {
  return { type: "ListConstructor", exprs };
}

export function tableGet(table: IR.Expr, key: IR.Expr): IR.TableGet {
  return { type: "TableGet", table, key };
}

export function tableSet(
  table: IR.Identifier | string,
  key: IR.Expr,
  value: IR.Expr
): IR.TableSet {
  return {
    type: "TableSet",
    table: typeof table === "string" ? id(table) : table,
    key,
    value,
  };
}

export function arrayGet(array: IR.Expr, index: IR.Expr): IR.ArrayGet {
  return { type: "ArrayGet", array, index };
}

export function variants(variants: IR.Block[]): IR.Variants {
  return { type: "Variants", variants };
}

export function arraySet(
  array: IR.Identifier | string,
  index: IR.Expr,
  value: IR.Expr
): IR.ArraySet {
  return {
    type: "ArraySet",
    array: typeof array === "string" ? id(array) : array,
    index,
    value,
  };
}

export function listGet(list: IR.Expr, index: IR.Expr): IR.ListGet {
  return { type: "ListGet", list, index };
}

export function listSet(
  list: IR.Identifier | string,
  index: IR.Expr,
  value: IR.Expr
): IR.ListSet {
  return {
    type: "ListSet",
    list: typeof list === "string" ? id(list) : list,
    index,
    value,
  };
}

export function listPush(
  list: IR.Identifier | string,
  value: IR.Expr
): IR.ListPush {
  return {
    type: "ListPush",
    list: typeof list === "string" ? id(list) : list,
    value,
  };
}

export function forRange(
  variable: IR.Identifier | string,
  low: IR.Expr,
  high: IR.Expr,
  increment: IR.Expr,
  body: IR.Block,
  inclusive: boolean
): IR.ForRange {
  return {
    type: "ForRange",
    variable: typeof variable === "string" ? id(variable) : variable,
    low,
    high,
    increment,
    body,
    inclusive,
  };
}

export function forEach(
  variable: IR.Identifier | string,
  collection: IR.Expr,
  body: IR.Block
): IR.ForEach {
  return {
    type: "ForEach",
    variable: typeof variable === "string" ? id(variable) : variable,
    collection,
    body,
  };
}

export function forEachKey(
  variable: IR.Identifier | string,
  table: IR.Expr,
  body: IR.Block
): IR.ForEachKey {
  return {
    type: "ForEachKey",
    variable: typeof variable === "string" ? id(variable) : variable,
    table,
    body,
  };
}

export function forCLike(
  init: IR.Block,
  append: IR.Block,
  condition: IR.Expr,
  body: IR.Block
): IR.ForCLike {
  return {
    type: "ForCLike",
    init,
    append,
    condition,
    body,
  };
}

export function forEachPair(
  keyVariable: IR.Identifier | string,
  valueVariable: IR.Identifier | string,
  table: IR.Expr,
  body: IR.Block
): IR.ForEachPair {
  return {
    type: "ForEachPair",
    keyVariable:
      typeof keyVariable === "string" ? id(keyVariable) : keyVariable,
    valueVariable:
      typeof valueVariable === "string" ? id(valueVariable) : valueVariable,
    table,
    body,
  };
}

export function manyToManyAssignment(
  variables: (IR.Identifier | string)[],
  exprs: IR.Expr[]
): IR.ManyToManyAssignment {
  return {
    type: "ManyToManyAssignment",
    variables: variables.map((v) => (typeof v === "string" ? id(v) : v)),
    exprs,
  };
}

export function oneToManyAssignment(
  variables: (IR.Identifier | string)[],
  expr: IR.Expr
): IR.OneToManyAssignment {
  return {
    type: "OneToManyAssignment",
    variables: variables.map((v) => (typeof v === "string" ? id(v) : v)),
    expr,
  };
}
