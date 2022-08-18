export type Node = Block | Statement;

export type Program = Block;

export interface Block {
  type: "Block";
  children: Statement[];
}

export type Statement = Expr | WhileLoop | IfStatement;

export interface WhileLoop {
  type: "WhileLoop";
  condition: Expr;
  body: Block;
}

/**
 * if (condition) { consequent } else { alternate }
 */
export interface IfStatement {
  type: "IfStatement";
  condition: Expr;
  consequent: Block;
  alternate: Block;
}

export type Expr = Assignment | Application | Identifier | Literal;

/**
 * Assignment of the form `variable = expr`
 *
 * Since many languages lack assignment expressions, assignments should be
 * statement-level by default.
 */
export interface Assignment {
  type: "Assignment";
  variable: Identifier;
  expr: Expr;
}

/**
 * A function application, such as (+ a b) or (print x)
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

export interface Identifier {
  type: "Identifier";
  name: string;
}

export type Literal = IntegerLiteral | StringLiteral;

export interface IntegerLiteral {
  type: "IntegerLiteral";
  value: BigInt;
}

export interface StringLiteral {
  type: "StringLiteral";
  value: string;
}
