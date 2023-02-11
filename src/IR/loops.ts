import { Expr, Identifier, id, int, block, BaseExpr } from "./IR";

/**
 * A while loop. Raw OK
 *
 * while (condition) { body }.
 */
export interface WhileLoop extends BaseExpr {
  readonly kind: "WhileLoop";
  readonly condition: Expr;
  readonly body: Expr;
}

/**
 * A loop over the integer interval [low, high) or [low, high] with increment.
 *
 * Increment is required but should default to 1 or -1 in most cases, allowing
 * the emitter to golf some output space
 *
 * Python: for variable in range(low, high, increment):body.
 */
export interface ForRange extends BaseExpr {
  readonly kind: "ForRange";
  readonly inclusive: boolean;
  readonly variable: Identifier;
  readonly low: Expr;
  readonly high: Expr;
  readonly increment: Expr;
  readonly body: Expr;
}

/**
 * A loop over the items in a collection.
 *
 * Python: for variable in collection:body.
 */
export interface ForEach extends BaseExpr {
  readonly kind: "ForEach";
  readonly variable: Identifier;
  readonly collection: Expr;
  readonly body: Expr;
}

/**
 * A loop over the keys in an table.
 *
 * Python: for variable in array:body.
 */
export interface ForEachKey extends BaseExpr {
  readonly kind: "ForEachKey";
  readonly variable: Identifier;
  readonly table: Expr;
  readonly body: Expr;
}

/**
 * A C like for loop.
 *
 * C: for(init;condition;append){body}.
 */
export interface ForCLike extends BaseExpr {
  readonly kind: "ForCLike";
  readonly init: Expr;
  readonly condition: Expr;
  readonly append: Expr;
  readonly body: Expr;
}

/**
 * A loop over the (key,value) pairs in a table (or (index, value) pairs in an array).
 *
 * Python: for variable in array:body.
 */
export interface ForEachPair extends BaseExpr {
  readonly kind: "ForEachPair";
  readonly keyVariable: Identifier;
  readonly valueVariable: Identifier;
  readonly table: Expr;
  readonly body: Expr;
}

export function whileLoop(condition: Expr, body: Expr): WhileLoop {
  return { kind: "WhileLoop", condition, body };
}

export function forRange(
  variable: Identifier | string,
  low: Expr,
  high: Expr,
  increment: Expr,
  body: Expr,
  inclusive: boolean = false
): ForRange {
  return {
    kind: "ForRange",
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
  ...body: readonly Expr[]
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
    body.length > 1 ? block(body) : body[0],
    bounds[4]
  );
}

export function forEach(
  variable: Identifier | string,
  collection: Expr,
  body: Expr
): ForEach {
  return {
    kind: "ForEach",
    variable: typeof variable === "string" ? id(variable) : variable,
    collection,
    body,
  };
}

export function forEachKey(
  variable: Identifier | string,
  table: Expr,
  body: Expr
): ForEachKey {
  return {
    kind: "ForEachKey",
    variable: typeof variable === "string" ? id(variable) : variable,
    table,
    body,
  };
}

export function forCLike(
  init: Expr,
  append: Expr,
  condition: Expr,
  body: Expr
): ForCLike {
  return {
    kind: "ForCLike",
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
  body: Expr
): ForEachPair {
  return {
    kind: "ForEachPair",
    keyVariable:
      typeof keyVariable === "string" ? id(keyVariable) : keyVariable,
    valueVariable:
      typeof valueVariable === "string" ? id(valueVariable) : valueVariable,
    table,
    body,
  };
}
