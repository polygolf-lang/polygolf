import { Expr, Identifier } from "./IR";

export interface FunctionCall {
  type: "FunctionCall";
  func: string;
  args: Expr[];
}

export interface MethodCall {
  type: "MethodCall";
  method: string;
  object: Expr;
  args: Expr[];
}

export type BuiltinBinop =
  // (num, num) => num
  | "add"
  | "sub"
  | "mul"
  | "div"
  | "exp"
  | "mod"
  | "bitand"
  | "bitor"
  | "bitxor"
  // (num, num) => bool
  | "lt"
  | "leq"
  | "eq"
  | "geq"
  | "gt"
  // membership
  | "inarray"
  | "inlist"
  | "inmap"
  | "inset"
  // other
  | "str_concat";

export interface BinaryOp {
  type: "BinaryOp";
  op: BuiltinBinop;
  left: Expr;
  right: Expr;
}

/**
 * Mutating operator.
 *
 * a += 5
 */
export interface MutatingBinaryOp {
  type: "MutatingBinaryOp";
  op: BuiltinBinop;
  variable: Identifier;
  right: Expr;
}

export type BuiltinUnary =
  | "bitnot"
  | "neg"
  | "int_to_str"
  | "str_to_int"
  | "cardinality"
  | "str_length"
  | "sorted";

export interface UnaryOp {
  type: "UnaryOp";
  op: BuiltinUnary;
  arg: Expr;
}

/**
 * Conditional ternary operator.
 *
 * Python: [alternate,consequent][condition].
 * C: condition?consequent:alternate.
 */
export interface ConditionalOp {
  type: "ConditionalOp";
  condition: Expr;
  consequent: Expr;
  alternate: Expr;
}

export interface Print {
  type: "Print";
  newline: boolean;
  value: Expr;
}

export function functionCall(func: string, args: Expr[]): FunctionCall {
  return { type: "FunctionCall", func, args };
}

export function methodCall(
  object: Expr,
  method: string,
  args: Expr[]
): MethodCall {
  return { type: "MethodCall", method, object, args };
}

export function binaryOp(op: BuiltinBinop, left: Expr, right: Expr): BinaryOp {
  return { type: "BinaryOp", op, left, right };
}

export function mutatingBinaryOp(
  op: BuiltinBinop,
  variable: Identifier,
  right: Expr
): MutatingBinaryOp {
  return { type: "MutatingBinaryOp", op, variable, right };
}

export function unaryOp(op: BuiltinUnary, arg: Expr): UnaryOp {
  return { type: "UnaryOp", op, arg };
}

export function print(value: Expr, newline: boolean = true): Print {
  return { type: "Print", newline, value };
}
