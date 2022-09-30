import { Expr, Identifier, BaseExpr, id } from "./IR";

/**
 * All expressions start as a `PolygolfOp` node.
 * Plugins (mainly `mapOps`plugin) then transform these to how they are represented in the target lang. (function, binary infix op, etc.)
 * This node should never enter the emit phase.
 */

export interface PolygolfOp extends BaseExpr {
  type: "PolygolfOp";
  op: OpCode;
  args: Expr[];
}

export interface FunctionCall extends BaseExpr {
  type: "FunctionCall";
  ident: Identifier;
  op: OpCode | null;
  args: Expr[];
}

export interface MethodCall extends BaseExpr {
  type: "MethodCall";
  ident: Identifier;
  op: OpCode | null;
  object: Expr;
  args: Expr[];
}

export const BinaryOpCodeArray = [
  // (num, num) => num
  "add",
  "sub",
  "mul",
  "div",
  "truncdiv",
  "exp",
  "mod",
  "rem",
  "bitand",
  "bitor",
  "bitxor",
  "gcd",
  // (num, num) => bool
  "lt",
  "leq",
  "eq",
  "neq",
  "geq",
  "gt",
  // (bool, bool) => bool
  "or",
  "and",
  // membership
  "inarray",
  "inlist",
  "inmap",
  "inset",
  // other
  "str_concat",
  "repeat",
  "is_substr",
  "str_find",
  "str_split",
  "join_using",
  "right_align",
  "int_to_bin_aligned",
  "int_to_hex_aligned",
  "simplify_fraction",
];
export type BinaryOpCode = typeof BinaryOpCodeArray[number];

export function flipOpCode(op: BinaryOpCode): BinaryOpCode | null {
  switch (op) {
    case "add":
      return "add";
    case "mul":
      return "mul";
    case "eq":
      return "eq";
    case "neq":
      return "neq";
    case "bitand":
      return "bitand";
    case "bitor":
      return "bitor";
    case "bitxor":
      return "bitxor";
    case "lt":
      return "gt";
    case "gt":
      return "lt";
    case "leq":
      return "geq";
    case "geq":
      return "leq";
  }
  return null;
}

export function negateOpCode(op: BinaryOpCode): BinaryOpCode | null {
  switch (op) {
    case "lt":
      return "geq";
    case "gt":
      return "leq";
    case "leq":
      return "gt";
    case "geq":
      return "lt";
  }
  return null;
}

export const UnaryOpCodeArray = [
  "bitnot",
  "neg",
  "not",
  "int_to_str",
  "int_to_bin",
  "int_to_hex",
  "str_to_int",
  "cardinality",
  "str_length",
  "str_split_whitespace",
  "sorted",
  "join",
  "str_reversed",
];
export type UnaryOpCode = typeof UnaryOpCodeArray[number];

export type OpCode =
  | BinaryOpCode
  | UnaryOpCode
  | "argv"
  | "print"
  | "printnl"
  | "str_replace"
  | "str_substr";

export interface BinaryOp extends BaseExpr {
  type: "BinaryOp";
  op: BinaryOpCode;
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
  op: BinaryOpCode;
  name: string;
  variable: Identifier;
  right: Expr;
}

export interface UnaryOp extends BaseExpr {
  type: "UnaryOp";
  name: string;
  op: UnaryOpCode;
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

export function polygolfOp(op: OpCode, ...args: Expr[]): PolygolfOp {
  return {
    type: "PolygolfOp",
    op,
    args,
  };
}

export function functionCall(
  args: Expr[],
  ident: string | Identifier,
  op?: OpCode
): FunctionCall {
  return {
    type: "FunctionCall",
    ident: typeof ident === "string" ? id(ident, true) : ident,
    op: op === undefined ? null : op,
    args,
  };
}

export function methodCall(
  object: Expr,
  args: Expr[],
  ident: string | Identifier,
  op?: OpCode
): MethodCall {
  return {
    type: "MethodCall",
    op: op === undefined ? null : op,
    ident: typeof ident === "string" ? id(ident, true) : ident,
    object,
    args,
  };
}

export function binaryOp(
  op: BinaryOpCode,
  left: Expr,
  right: Expr,
  name: string = "",
  precedence?: number,
  rightAssociative?: boolean
): BinaryOp {
  return {
    type: "BinaryOp",
    op,
    left,
    right,
    name,
    precedence: precedence ?? getDefaultPrecedence(op),
    rightAssociative: rightAssociative ?? (op === "exp" || op === "str_concat"),
  };
}

export function mutatingBinaryOp(
  op: BinaryOpCode,
  variable: Identifier,
  right: Expr,
  name: string = ""
): MutatingBinaryOp {
  return {
    type: "MutatingBinaryOp",
    op,
    variable,
    right,
    name,
  };
}

export function unaryOp(
  op: UnaryOpCode,
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

export function print(value: Expr, newline: boolean = true): PolygolfOp {
  return polygolfOp(newline ? "printnl" : "print", value);
}

function getDefaultPrecedence(op: BinaryOpCode | UnaryOpCode): number {
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
