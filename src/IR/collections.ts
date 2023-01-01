import { BaseExpr, Expr, KeyValue } from "./IR";

export interface ArrayConstructor extends BaseExpr {
  readonly kind: "ArrayConstructor";
  readonly exprs: readonly Expr[];
}

export interface ListConstructor extends BaseExpr {
  readonly kind: "ListConstructor";
  readonly exprs: readonly Expr[];
}

export interface SetConstructor extends BaseExpr {
  readonly kind: "SetConstructor";
  readonly exprs: readonly Expr[];
}

export interface TableConstructor extends BaseExpr {
  readonly kind: "TableConstructor";
  readonly kvPairs: readonly KeyValue[];
}

export function arrayConstructor(exprs: readonly Expr[]): ArrayConstructor {
  return {
    kind: "ArrayConstructor",
    exprs,
  };
}

export function listConstructor(exprs: readonly Expr[]): ListConstructor {
  return {
    kind: "ListConstructor",
    exprs,
  };
}

export function setConstructor(exprs: readonly Expr[]): SetConstructor {
  return {
    kind: "SetConstructor",
    exprs,
  };
}

export function tableConstructor(
  kvPairs: readonly KeyValue[]
): TableConstructor {
  return {
    kind: "TableConstructor",
    kvPairs,
  };
}
