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

export type BuiltinUnary = "bitnot" | "neg";

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

/**
 * A general function application, such as (+ a b) or (print x). Raw OK
 *
 * Every language frontend should convert *all* function applications to
 * narrower types such as FunctionCall, MethodCall, BinaryOp, or UnaryOp.
 */
export interface Application {
  type: "Application";
  name: Builtin;
  args: Expr[];
}

export type Builtin =
  // one argument
  | "print"
  | "println"
  | "str_length"
  | "cardinality"
  | "int_to_str"
  | "str_to_int"
  | "sorted"
  // other two argument
  | "str_get_byte"
  | "contains_key"
  | "contains_value"
  | "indexof"; // finds the first index of element in the array, or -1 if it is not present

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

export function application(name: Builtin, args: Expr[]): Application {
  return { type: "Application", name, args };
}
