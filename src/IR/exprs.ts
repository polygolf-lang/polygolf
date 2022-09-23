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
  | "rem"
  | "bitand"
  | "bitor"
  | "bitxor"
  // (num, num) => bool
  | "lt"
  | "leq"
  | "eq"
  | "neq"
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
  | "str_concat"
  | "repeat"
  | "not";

export interface BinaryOp extends BaseExpr {
  type: "BinaryOp";
  op: BuiltinBinop;
  name: string;
  left: Expr;
  right: Expr;
  precedence: number;
  rightAssociative: boolean;
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
  precedence: number;
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
  name: string = "",
  precedence?: number
): BinaryOp {
  return {
    type: "BinaryOp",
    op,
    left,
    right,
    name,
    precedence: precedence ?? getDefaultPrecedence(op),
    rightAssociative: op === "exp" || op === "str_concat",
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
  name: string = "",
  precedence?: number
): UnaryOp {
  return {
    type: "UnaryOp",
    op,
    arg,
    name,
    precedence: precedence ?? getDefaultPrecedence(op),
  };
}

export function print(value: Expr, newline: boolean = true): Print {
  return { type: "Print", newline, value };
}

function getDefaultPrecedence(op: BuiltinBinop | BuiltinUnary): number {
  switch (op) {
    case "exp":
      return 130;
    case "neg":
      return 120;
    case "repeat":
    case "mul":
    case "div":
    case "mod":
      return 110;
    case "add":
    case "sub":
      return 100;
    case "bitand":
      return 80;
    case "bitxor":
      return 70;
    case "bitor":
      return 60;
    case "str_concat":
      return 50;
    case "lt":
    case "gt":
    case "leq":
    case "geq":
    case "eq":
    case "neq":
    case "inarray":
    case "inset":
    case "inlist":
    case "inmap":
      return 40;
    case "not":
      return 30;
    case "and":
      return 20;
    case "or":
      return 10;
    default:
      return 0;
  }
}
