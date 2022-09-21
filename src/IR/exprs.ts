import { Expr, Identifier, BaseExpr } from "./IR";

export interface FunctionCall extends BaseExpr {
  type: "FunctionCall";
  name: string;
  op: OpCode;
  args: Expr[];
}

export interface MethodCall extends BaseExpr {
  type: "MethodCall";
  name: string;
  op: OpCode;
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
  // (bool, bool) => bool
  | "or"
  | "and"
  // membership
  | "inarray"
  | "inlist"
  | "inmap"
  | "inset"
  // other
  | "str_concat";

export interface BinaryOp extends BaseExpr {
  type: "BinaryOp";
  op: BuiltinBinop;
  name: string;
  left: Expr;
  right: Expr;
}

/**
 * Mutating operator.
 *
 * a += 5
 */
export interface MutatingBinaryOp extends BaseExpr {
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

export type OpCode = BuiltinBinop | BuiltinUnary;

export interface UnaryOp extends BaseExpr {
  type: "UnaryOp";
  name: string;
  op: BuiltinUnary;
  arg: Expr;
}

/**
 * Conditional ternary operator.
 *
 * Python: [alternate,consequent][condition].
 * C: condition?consequent:alternate.
 */
export interface ConditionalOp extends BaseExpr {
  type: "ConditionalOp";
  condition: Expr;
  consequent: Expr;
  alternate: Expr;
}

export interface Print extends BaseExpr {
  type: "Print";
  newline: boolean;
  value: Expr;
}

export function functionCall(
  op: OpCode,
  args: Expr[],
  name: string
): FunctionCall {
  return {
    type: "FunctionCall",
    name,
    op,
    args,
  };
}

export function methodCall(
  op: OpCode,
  object: Expr,
  args: Expr[],
  name: string
): MethodCall {
  return {
    type: "MethodCall",
    op,
    name,
    object,
    args,
  };
}

export function binaryOp(
  op: BuiltinBinop,
  left: Expr,
  right: Expr,
  name: string = ""
): BinaryOp {
  return {
    type: "BinaryOp",
    op,
    left,
    right,
    name,
  };
}

export function mutatingBinaryOp(
  op: BuiltinBinop,
  variable: Identifier,
  right: Expr
): MutatingBinaryOp {
  return {
    type: "MutatingBinaryOp",
    op,
    variable,
    right,
  };
}

export function unaryOp(
  op: BuiltinUnary,
  arg: Expr,
  name: string = ""
): UnaryOp {
  return { type: "UnaryOp", op, arg, name };
}

export function print(value: Expr, newline: boolean = true): Print {
  return { type: "Print", newline, value };
}
