import { BaseNode, Node, KeyValue } from "./IR";

export interface ArrayConstructor extends BaseNode {
  readonly kind: "ArrayConstructor";
  readonly exprs: readonly Node[];
}

export interface ListConstructor extends BaseNode {
  readonly kind: "ListConstructor";
  readonly exprs: readonly Node[];
}

export interface SetConstructor extends BaseNode {
  readonly kind: "SetConstructor";
  readonly exprs: readonly Node[];
}

export interface TableConstructor extends BaseNode {
  readonly kind: "TableConstructor";
  readonly kvPairs: readonly KeyValue[];
}

export function arrayConstructor(exprs: readonly Node[]): ArrayConstructor {
  return {
    kind: "ArrayConstructor",
    exprs,
  };
}

export function listConstructor(exprs: readonly Node[]): ListConstructor {
  return {
    kind: "ListConstructor",
    exprs,
  };
}

export function setConstructor(exprs: readonly Node[]): SetConstructor {
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
