import { Node, Identifier, id, int, block, BaseNode } from "./IR";

/**
 * A while loop. Raw OK
 *
 * while (condition) { body }.
 */
export interface WhileLoop extends BaseNode {
  readonly kind: "WhileLoop";
  readonly condition: Node;
  readonly body: Node;
}

/**
 * A loop over the integer interval [low, high) or [low, high] with increment.
 *
 * Increment is required but should default to 1 or -1 in most cases, allowing
 * the emitter to golf some output space
 *
 * Python: for variable in range(low, high, increment):body.
 */
export interface ForRange extends BaseNode {
  readonly kind: "ForRange";
  readonly inclusive: boolean;
  readonly variable: Identifier | undefined;
  readonly start: Node;
  readonly end: Node;
  readonly increment: Node;
  readonly body: Node;
}

/**
 * A loop over the integer interval [low, low+difference) or [low, low+difference] with increment.
 *
 * Increment is required but should default to 1 or -1 in most cases, allowing
 * the emitter to golf some output space
 *
 * Python: for variable in range(low, low+difference, increment):body.
 */
export interface ForDifferenceRange extends BaseNode {
  readonly kind: "ForDifferenceRange";
  readonly inclusive: boolean;
  readonly variable: Identifier;
  readonly start: Node;
  readonly difference: Node;
  readonly increment: Node;
  readonly body: Node;
}

/**
 * A loop over the items in a collection.
 *
 * Python: for variable in collection:body.
 */
export interface ForEach extends BaseNode {
  readonly kind: "ForEach";
  readonly variable: Identifier;
  readonly collection: Node;
  readonly body: Node;
}

/**
 * A loop over the keys in an table.
 *
 * Python: for variable in array:body.
 */
export interface ForEachKey extends BaseNode {
  readonly kind: "ForEachKey";
  readonly variable: Identifier;
  readonly table: Node;
  readonly body: Node;
}

/**
 * A C like for loop.
 *
 * C: for(init;condition;append){body}.
 */
export interface ForCLike extends BaseNode {
  readonly kind: "ForCLike";
  readonly init: Node;
  readonly condition: Node;
  readonly append: Node;
  readonly body: Node;
}

/**
 * A loop over the (key,value) pairs in a table (or (index, value) pairs in an array).
 *
 * Python: for variable in array:body.
 */
export interface ForEachPair extends BaseNode {
  readonly kind: "ForEachPair";
  readonly keyVariable: Identifier;
  readonly valueVariable: Identifier;
  readonly table: Node;
  readonly body: Node;
}

/**
 * A loop over argv, with upper bound of argc.
 *
 */
export interface ForArgv extends BaseNode {
  readonly kind: "ForArgv";
  readonly variable: Identifier;
  readonly argcUpperBound: number;
  readonly body: Node;
}

export function whileLoop(condition: Node, body: Node): WhileLoop {
  return { kind: "WhileLoop", condition, body };
}

export function forRange(
  variable: Identifier | string | undefined,
  start: Node,
  end: Node,
  increment: Node,
  body: Node,
  inclusive: boolean = false
): ForRange {
  return {
    kind: "ForRange",
    variable: typeof variable === "string" ? id(variable) : variable,
    start,
    end,
    increment,
    body,
    inclusive,
  };
}

export function forDifferenceRange(
  variable: Identifier | string,
  start: Node,
  difference: Node,
  increment: Node,
  body: Node,
  inclusive: boolean = false
): ForDifferenceRange {
  return {
    kind: "ForDifferenceRange",
    variable: typeof variable === "string" ? id(variable) : variable,
    start,
    difference,
    increment,
    body,
    inclusive,
  };
}

export function forRangeCommon(
  bounds: [string, Node | number, Node | number, (Node | number)?, boolean?],
  ...body: readonly Node[]
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
  collection: Node,
  body: Node
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
  table: Node,
  body: Node
): ForEachKey {
  return {
    kind: "ForEachKey",
    variable: typeof variable === "string" ? id(variable) : variable,
    table,
    body,
  };
}

export function forCLike(
  init: Node,
  condition: Node,
  append: Node,
  body: Node
): ForCLike {
  return {
    kind: "ForCLike",
    init,
    condition,
    append,
    body,
  };
}

export function forEachPair(
  keyVariable: Identifier | string,
  valueVariable: Identifier | string,
  table: Node,
  body: Node
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

export function forArgv(
  variable: Identifier,
  argcUpperBound: number,
  body: Node
): ForArgv {
  return {
    kind: "ForArgv",
    variable,
    argcUpperBound,
    body,
  };
}
