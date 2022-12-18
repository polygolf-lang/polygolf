import { BaseExpr, Expr, KeyValue } from "./IR";
/**
 * Array constructor. Raw OK
 *
 */
export interface ArrayConstructor extends BaseExpr {
  kind: "ArrayConstructor";
  exprs: Expr[];
}

/**
 * List constructor. Raw OK
 *
 */
export interface ListConstructor extends BaseExpr {
  kind: "ListConstructor";
  exprs: Expr[];
}

export interface SetConstructor extends BaseExpr {
  kind: "SetConstructor";
  exprs: Expr[];
}

export interface TableConstructor extends BaseExpr {
  kind: "TableConstructor";
  kvPairs: KeyValue[];
}

export function arrayConstructor(exprs: Expr[]): ArrayConstructor {
  return {
    kind: "ArrayConstructor",
    exprs,
  };
}

export function listConstructor(exprs: Expr[]): ListConstructor {
  return {
    kind: "ListConstructor",
    exprs,
  };
}

export function setConstructor(exprs: Expr[]): SetConstructor {
  return {
    kind: "SetConstructor",
    exprs,
  };
}

export function tableConstructor(kvPairs: KeyValue[]): TableConstructor {
  return {
    kind: "TableConstructor",
    kvPairs,
  };
}
