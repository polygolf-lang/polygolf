export type Node = Program | Block | Statement;

export type Statement = Expr | WhileLoop | IfStatement;

export type Expr =
  | Assignment
  | Application
  | FunctionCall
  | MethodCall
  | BinaryOp
  | UnaryOp
  | Identifier
  | StringLiteral
  | IntegerLiteral;

/**
 * Program node. This should be the root node. Raw OK
 */
export type Program = {
  type: "Program";
  block: Block;
};

/**
 * A block of several statements. Raw OK
 */
export interface Block {
  type: "Block";
  children: Statement[];
}

/**
 * A while loop. Raw OK
 *
 * while (condition) { body }.
 */
export interface WhileLoop {
  type: "WhileLoop";
  condition: Expr;
  body: Block;
}

/**
 * A C-like if statement (not ternary expression). Raw OK
 *
 * if (condition) { consequent } else { alternate }
 */
export interface IfStatement {
  type: "IfStatement";
  condition: Expr;
  consequent: Block;
  alternate: Block;
}

/**
 * Assignment statement of the form `variable = expr`. Raw OK
 *
 * Since many languages lack assignment expressions, assignments are
 * statement-level by default.
 */
export interface Assignment {
  type: "Assignment";
  variable: Identifier;
  expr: Expr;
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
  | "int_to_str"
  | "str_to_int"
  | "sort"
  | "bitnot"
  | "neg"
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
  // other two argument
  | "array_get"
  | "str_get_byte"
  | "str_concat";

/**
 * An identifier, such as referring to a global variable. Raw OK
 */
export interface Identifier {
  type: "Identifier";
  name: string;
}

/**
 * An unbounded integer constant. Raw OK
 */
export interface IntegerLiteral {
  type: "IntegerLiteral";
  value: BigInt;
}

/**
 * A string literal suitable for printing. Raw OK
 *
 * There is no distinction for byte vs unicode strings
 */
export interface StringLiteral {
  type: "StringLiteral";
  value: string;
}

/// === Interfaces below here are language-specific ===

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

export interface UnaryOp {
  type: "UnaryOp";
  op: string;
  arg: Expr;
}

export interface ArrayAccess {
  type: "ArrayAccess";
  array: Expr;
  index: Expr;
}
