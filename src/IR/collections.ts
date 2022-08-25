import {
  arrayType,
  BaseExpr,
  Expr,
  id,
  Identifier,
  listType,
  simpleType,
  ValueType,
} from "./IR";

export interface StringGetByte extends BaseExpr {
  type: "StringGetByte";
  unicode: boolean;
  string: Expr;
  index: Expr;
  oneIndexed: boolean;
}

export interface ArrayGet extends BaseExpr {
  type: "ArrayGet";
  array: Expr;
  index: Expr;
  oneIndexed: boolean;
}

export interface ArraySet extends BaseExpr {
  type: "ArraySet";
  array: Identifier;
  index: Expr;
  value: Expr;
  oneIndexed: boolean;
}

export interface ListGet extends BaseExpr {
  type: "ListGet";
  list: Expr;
  index: Expr;
  oneIndexed: boolean;
}

export interface ListSet extends BaseExpr {
  type: "ListSet";
  list: Identifier;
  index: Expr;
  value: Expr;
  oneIndexed: boolean;
}

export interface ListPush extends BaseExpr {
  type: "ListPush";
  list: Identifier;
  value: Expr;
}

/**
 * Array constructor. Raw OK
 *
 */
export interface ArrayConstructor extends BaseExpr {
  type: "ArrayConstructor";
  exprs: Expr[];
}

/**
 * List constructor. Raw OK
 *
 */
export interface ListConstructor extends BaseExpr {
  type: "ListConstructor";
  exprs: Expr[];
}

/**
 * Getting a table value at given key. Raw OK
 *
 * table[key]
 */
export interface TableGet extends BaseExpr {
  type: "TableGet";
  table: Expr;
  key: Expr;
}

/**
 * Setting a table value at given key. Raw OK
 *
 * table[key] = value
 */
export interface TableSet extends BaseExpr {
  type: "TableSet";
  table: Identifier;
  key: Expr;
  value: Expr;
}

export function arrayConstructor(exprs: Expr[]): ArrayConstructor {
  return {
    type: "ArrayConstructor",
    exprs,
  };
}

export function listConstructor(exprs: Expr[]): ListConstructor {
  return {
    type: "ListConstructor",
    exprs,
  };
}

export function tableGet(table: Expr, key: Expr): TableGet {
  return { type: "TableGet", table, key };
}

export function tableSet(
  table: Identifier | string,
  key: Expr,
  value: Expr
): TableSet {
  return {
    type: "TableSet",
    table: typeof table === "string" ? id(table) : table,
    key,
    value,
  };
}

export function stringGetByte(
  string: Expr,
  index: Expr,
  unicode: boolean = false,
  oneIndexed: boolean = false
): StringGetByte {
  return {
    type: "StringGetByte",
    string,
    index,
    unicode,
    oneIndexed,
  };
}

export function arrayGet(
  array: Expr,
  index: Expr,
  oneIndexed = false
): ArrayGet {
  return {
    type: "ArrayGet",
    array,
    index,
    oneIndexed,
  };
}

export function listGet(list: Expr, index: Expr, oneIndexed = false): ListGet {
  return {
    type: "ListGet",
    list,
    index,
    oneIndexed,
  };
}

export function listSet(
  list: Identifier | string,
  index: Expr,
  value: Expr,
  oneIndexed = false
): ListSet {
  return {
    type: "ListSet",
    list: typeof list === "string" ? id(list) : list,
    index,
    value,
    oneIndexed,
  };
}

export function listPush(list: Identifier | string, value: Expr): ListPush {
  return {
    type: "ListPush",
    list: typeof list === "string" ? id(list) : list,
    value,
  };
}

export function arraySet(
  array: Identifier | string,
  index: Expr,
  value: Expr,
  oneIndexed = false
): ArraySet {
  return {
    type: "ArraySet",
    array: typeof array === "string" ? id(array) : array,
    index,
    value,
    oneIndexed,
  };
}
