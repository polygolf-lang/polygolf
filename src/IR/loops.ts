import {
  type Node,
  type Identifier,
  id,
  int,
  block,
  type BaseNode,
  op,
  isOp,
  type Op,
} from "./IR";

/**
 * A while loop. Raw OK
 *
 * while (condition) { body }.
 */
export interface While extends BaseNode {
  readonly kind: "While";
  readonly condition: Node;
  readonly body: Node;
}

/**
 * A loop over the items in a collection.
 *
 * Python: for variable in collection:body.
 */
export interface ForEach<T extends Node = Node> extends BaseNode {
  readonly kind: "ForEach";
  readonly variable?: Identifier;
  readonly collection: T;
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

export function whileLoop(condition: Node, body: Node): While {
  return { kind: "While", condition, body };
}

export function forRangeCommon(
  [variable, start, end, step, inclusive]: [
    string,
    Node | number,
    Node | number,
    (Node | number)?,
    boolean?,
  ],
  ...body: readonly Node[]
): ForEach {
  return forEach(
    variable,
    op[inclusive === true ? "range_incl" : "range_excl"](
      typeof start === "number" ? int(BigInt(start)) : start,
      typeof end === "number" ? int(BigInt(end)) : end,
      step === undefined
        ? int(1n)
        : typeof step === "number"
        ? int(BigInt(step))
        : step,
    ),
    body.length > 1 ? block(body) : body[0],
  );
}

export function forEach(
  variable: Identifier | string | undefined,
  collection: Node,
  body: Node,
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
  body: Node,
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
  body: Node,
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
  body: Node,
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
  body: Node,
): ForArgv {
  return {
    kind: "ForArgv",
    variable,
    argcUpperBound,
    body,
  };
}

export const isRangeOp = isOp("range_excl", "range_incl");
export function isForRange(
  x: Node,
): x is ForEach<Op<"range_incl" | "range_excl">> {
  return x.kind === "ForEach" && isRangeOp(x.collection);
}
