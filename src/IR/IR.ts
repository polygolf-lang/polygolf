export type Node = Program | Block | Statement;

export type Statement =
  | Expr
  | WhileLoop
  | ForRange
  | ForRangeInclusive
  | ForEach
  | ForEachKey
  | ForEachPair
  | ForCLike
  | IfStatement
  | Variants;

export type Expr =
  | Argv
  | VarDeclaration
  | Assignment
  | Application
  | FunctionCall
  | MethodCall
  | BinaryOp
  | UnaryOp
  | Identifier
  | StringLiteral
  | IntegerLiteral
  | ArrayConstructor
  | ListConstructor
  | TableGet
  | TableSet
  | ArrayGet
  | ArraySet
  | ListGet
  | ListSet
  | ListPush
  | Import
  | MutatingBinaryOp
  | ConditionalOp
  | ManyToManyAssignment
  | OneToManyAssignment;

/**
 * Variants node. Variants are recursively expanded. All variants are then subject to the rest of the pipeline.
 */
export type Variants = {
  type: "Variants";
  variants: Block[];
};

/**
 * Program node. This should be the root node. Raw OK
 */
export type Program = {
  type: "Program";
  imports: Import[];
  varDeclarations: VarDeclaration[];
  block: Block;
};

/**
 * Program input (array of strings) as niladic variable.
 */
export type Argv = {
  type: "Argv";
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

/** The type of the value of a node when evaluated */
export type ValueType =
  | "number"
  | "string"
  | "boolean"
  | { type: "List"; member: ValueType }
  | { type: "Table"; key: "number" | "string"; value: ValueType }
  | { type: "Array"; member: ValueType; length: number }
  | { type: "Set"; member: ValueType };

/**
 * Variable declaration.
 */
export interface VarDeclaration {
  type: "VarDeclaration";
  variable: Identifier;
  variableType: ValueType;
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
  | "str_concat"
  | "contains_key"
  | "contains_value"
  | "indexof"; // finds the first index of element in the array, or -1 if it is not present

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

/**
 * Array constructor. Raw OK
 *
 */
export interface ArrayConstructor {
  type: "ArrayConstructor";
  exprs: Expr[];
}

/**
 * List constructor. Raw OK
 *
 */
export interface ListConstructor {
  type: "ListConstructor";
  exprs: Expr[];
}

/**
 * Getting a table value at given key. Raw OK
 *
 * table[key]
 */
export interface TableGet {
  type: "TableGet";
  table: Expr;
  key: Expr;
}

/**
 * Setting a table value at given key. Raw OK
 *
 * table[key] = value
 */
export interface TableSet {
  type: "TableSet";
  table: Identifier;
  key: Expr;
  value: Expr;
}

/// === Interfaces below here are language-specific ===

/**
 * Import.
 */
export interface Import {
  type: "Import";
  name: string;
}

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

export interface ArrayGet {
  type: "ArrayGet";
  array: Expr;
  index: Expr;
}

export interface ArraySet {
  type: "ArraySet";
  array: Identifier;
  index: Expr;
  value: Expr;
}
export interface ListGet {
  type: "ListGet";
  list: Expr;
  index: Expr;
}

export interface ListSet {
  type: "ListSet";
  list: Identifier;
  index: Expr;
  value: Expr;
}

export interface ListPush {
  type: "ListPush";
  list: Identifier;
  value: Expr;
}

/**
 * A loop over the integer interval [low, high) with optional increment.
 *
 * Python: for variable in range(low, high, increment):body.
 */
export interface ForRange {
  type: "ForRange";
  variable: Identifier;
  low: Expr;
  high: Expr;
  increment: Expr | null;
  body: Block;
}

/**
 * A loop over the integer interval [low, high] with optional increment.
 *
 * Python: for variable in range(low, high+1, increment):body.
 */
export interface ForRangeInclusive {
  type: "ForRangeInclusive";
  variable: Identifier;
  low: Expr;
  high: Expr;
  increment: Expr | null;
  body: Block;
}

/**
 * A loop over the items in a collection.
 *
 * Python: for variable in collection:body.
 */
export interface ForEach {
  type: "ForEach";
  variable: Identifier;
  collection: Expr;
  body: Block;
}

/**
 * A loop over the keys in an table.
 *
 * Python: for variable in array:body.
 */
export interface ForEachKey {
  type: "ForEachKey";
  variable: Identifier;
  table: Expr;
  body: Block;
}

/**
 * A C like for loop.
 *
 * C: for(init;condition;append){body}.
 */
export interface ForCLike {
  type: "ForCLike";
  init: Block;
  append: Block;
  condition: Expr;
  body: Block;
}

/**
 * A loop over the (key,value) pairs in a table (or (index, value) pairs in an array).
 *
 * Python: for variable in array:body.
 */
export interface ForEachPair {
  type: "ForEachPair";
  keyVariable: Identifier;
  valueVariable: Identifier;
  table: Expr;
  body: Block;
}

/**
 * Multiple assignment.
 *
 * (a,b)=(b,a).
 */
export interface ManyToManyAssignment {
  type: "ManyToManyAssignment";
  variables: Identifier[];
  exprs: Expr[];
}

/**
 * Multiple assignment.
 *
 * a=b=c=1.
 */
export interface OneToManyAssignment {
  type: "OneToManyAssignment";
  variables: Identifier[];
  expr: Expr;
}
