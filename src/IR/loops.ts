import { Expr, Block, Identifier } from "./IR";

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
