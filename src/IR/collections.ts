import {
  arrayType,
  Expr,
  id,
  Identifier,
  listType,
  simpleType,
  ValueType,
} from "./IR";

export interface StringGet {
  type: "StringGet";
  unicode: boolean;
  string: Expr;
  index: Expr;
  oneIndexed: boolean;
  valueType: ValueType;
}

export interface ArrayGet {
  type: "ArrayGet";
  array: Expr;
  index: Expr;
  oneIndexed: boolean;
  valueType: ValueType;
}

export interface ArraySet {
  type: "ArraySet";
  array: Identifier;
  index: Expr;
  value: Expr;
  oneIndexed: boolean;
  valueType: ValueType;
}

export interface ListGet {
  type: "ListGet";
  list: Expr;
  index: Expr;
  oneIndexed: boolean;
  valueType: ValueType;
}

export interface ListSet {
  type: "ListSet";
  list: Identifier;
  index: Expr;
  value: Expr;
  oneIndexed: boolean;
  valueType: ValueType;
}

export interface ListPush {
  type: "ListPush";
  list: Identifier;
  value: Expr;
  valueType: ValueType;
}

/**
 * Array constructor. Raw OK
 *
 */
export interface ArrayConstructor {
  type: "ArrayConstructor";
  exprs: Expr[];
  valueType: ValueType;
}

/**
 * List constructor. Raw OK
 *
 */
export interface ListConstructor {
  type: "ListConstructor";
  exprs: Expr[];
  valueType: ValueType;
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
  valueType: ValueType;
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
  valueType: ValueType;
}

export function arrayConstructor(exprs: Expr[]): ArrayConstructor {
  return {
    type: "ArrayConstructor",
    exprs,
    valueType: arrayType(exprs[0].valueType, exprs.length),
  };
}

export function listConstructor(exprs: Expr[]): ListConstructor {
  return {
    type: "ListConstructor",
    exprs,
    valueType: listType(exprs[0].valueType),
  };
}

export function tableGet(table: Expr, key: Expr): TableGet {
  if (table.valueType.type !== "Table") {
    throw new Error("First arg of tableGet must be a table!");
  }
  return { type: "TableGet", table, key, valueType: table.valueType.value };
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
    valueType: simpleType("void"),
  };
}

export function stringGet(
  string: Expr,
  index: Expr,
  unicode: boolean = false,
  oneIndexed: boolean = false
): StringGet {
  return {
    type: "StringGet",
    string,
    index,
    unicode,
    oneIndexed,
    valueType: simpleType("string"),
  };
}

export function arrayGet(
  array: Expr,
  index: Expr,
  oneIndexed = false
): ArrayGet {
  if (array.valueType instanceof String || array.valueType.type !== "Array") {
    throw new Error("First arg of arrayGet must be an array!");
  }
  return {
    type: "ArrayGet",
    array,
    index,
    oneIndexed,
    valueType: array.valueType.member,
  };
}

export function listGet(list: Expr, index: Expr, oneIndexed = false): ListGet {
  if (list.valueType instanceof String || list.valueType.type !== "List") {
    throw new Error("First arg of listGet must be a list!");
  }
  return {
    type: "ListGet",
    list,
    index,
    oneIndexed,
    valueType: list.valueType.member,
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
    valueType: simpleType("void"),
  };
}

export function listPush(list: Identifier | string, value: Expr): ListPush {
  return {
    type: "ListPush",
    list: typeof list === "string" ? id(list) : list,
    value,
    valueType: simpleType("void"),
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
    valueType: simpleType("void"),
  };
}
