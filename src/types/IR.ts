export type Program = Block;

export class Block {
  constructor(public children: Statement[]) {}
}

export type Statement = Expr | WhileLoop | IfStatement;

export class WhileLoop {
  constructor(public condition: Expr, public body: Block) {}
}

export class IfStatement {
  constructor(
    public condition: Expr,
    public consequent: Block,
    public alternate: Block
  ) {}
}

export type Expr = Assignment | Application | Identifier | Literal;

/**
 * Assignment of the form `variable = expr`
 *
 * Since many languages lack assignment expressions, assignments should be
 * statement-level by default.
 */
export class Assignment {
  constructor(public variable: string, public expr: Expr) {}
}

/**
 * A function application, such as (+ a b) or (print x)
 */
export class Application {
  constructor(public name: Builtin, public args: Expr[]) {}
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
  // other two arugment
  | "array_get"
  | "str_get_byte"
  | "str_concat";

export class Identifier {
  constructor(public name: string) {}
}

export type Literal = IntegerLiteral | StringLiteral;

export class IntegerLiteral {
  constructor(public value: BigInt) {}
}

export class StringLiteral {
  constructor(public value: string) {}
}
