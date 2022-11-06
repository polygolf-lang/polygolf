import { BaseExpr, Expr, KeyValue } from "./IR";
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

export interface SetConstructor extends BaseExpr {
  type: "SetConstructor";
  exprs: Expr[];
}

export interface TableConstructor extends BaseExpr {
  type: "TableConstructor";
  kvPairs: KeyValue[];
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

export function setConstructor(exprs: Expr[]): SetConstructor {
  return {
    type: "SetConstructor",
    exprs,
  };
}

export function tableConstructor(kvPairs: KeyValue[]): TableConstructor {
  return {
    type: "TableConstructor",
    kvPairs,
  };
}
