import { Expr, Block, Identifier, id, Statement, int, block } from "./IR";

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
 * A loop over the integer interval [low, high) or [low, high] with increment.
 *
 * Increment is required but should default to 1 or -1 in most cases, allowing
 * the emitter to golf some output space
 *
 * Python: for variable in range(low, high, increment):body.
 */
export interface ForRange {
  type: "ForRange";
  inclusive: boolean;
  variable: Identifier;
  low: Expr;
  high: Expr;
  increment: Expr;
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
  condition: Expr;
  append: Block;
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

export function whileLoop(condition: Expr, body: Block): WhileLoop {
  return { type: "WhileLoop", condition, body };
}

export function forRange(
  variable: Identifier | string,
  low: Expr,
  high: Expr,
  increment: Expr,
  body: Block,
  inclusive: boolean = false
): ForRange {
  return {
    type: "ForRange",
    variable: typeof variable === "string" ? id(variable) : variable,
    low,
    high,
    increment,
    body,
    inclusive,
  };
}

export function forRangeCommon(
  bounds: [string, Expr | number, Expr | number, (Expr | number)?, boolean?],
  ...body: Statement[]
): ForRange {
  return forRange(
    bounds[0],
    typeof bounds[1] === "number" ? int(BigInt(bounds[1])) : bounds[1],
    typeof bounds[2] === "number" ? int(BigInt(bounds[2])) : bounds[2],
    bounds[3] === undefined
      ? int(1n)
      : typeof bounds[3] === "number"
      ? int(BigInt(bounds[3]))
      : bounds[3],
    block(body),
    bounds[4]
  );
}

export function forEach(
  variable: Identifier | string,
  collection: Expr,
  body: Block
): ForEach {
  return {
    type: "ForEach",
    variable: typeof variable === "string" ? id(variable) : variable,
    collection,
    body,
  };
}

export function forEachKey(
  variable: Identifier | string,
  table: Expr,
  body: Block
): ForEachKey {
  return {
    type: "ForEachKey",
    variable: typeof variable === "string" ? id(variable) : variable,
    table,
    body,
  };
}

export function forCLike(
  init: Block,
  append: Block,
  condition: Expr,
  body: Block
): ForCLike {
  return {
    type: "ForCLike",
    init,
    append,
    condition,
    body,
  };
}

export function forEachPair(
  keyVariable: Identifier | string,
  valueVariable: Identifier | string,
  table: Expr,
  body: Block
): ForEachPair {
  return {
    type: "ForEachPair",
    keyVariable:
      typeof keyVariable === "string" ? id(keyVariable) : keyVariable,
    valueVariable:
      typeof valueVariable === "string" ? id(valueVariable) : valueVariable,
    table,
    body,
  };
}
