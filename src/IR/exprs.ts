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

export interface BinaryOp {
  type: "BinaryOp";
  op: string;
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
  op: string;
  variable: Identifier;
  right: Expr;
}

export interface UnaryOp {
  type: "UnaryOp";
  op: string;
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

export type BuiltinUnary = "bitnot" | "neg";

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
