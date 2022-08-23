import { Expr, Identifier } from "./IR";

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
