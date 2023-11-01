import { type BaseNode, type Node, type KeyValue } from "./IR";

export interface Array extends BaseNode {
  readonly kind: "Array";
  readonly exprs: readonly Node[];
}

export interface List extends BaseNode {
  readonly kind: "List";
  readonly exprs: readonly Node[];
}

export interface Set extends BaseNode {
  readonly kind: "Set";
  readonly exprs: readonly Node[];
}

export interface Table extends BaseNode {
  readonly kind: "Table";
  readonly kvPairs: readonly KeyValue[];
}

export function array(exprs: readonly Node[]): Array {
  return {
    kind: "Array",
    exprs,
  };
}

export function list(exprs: readonly Node[]): List {
  return {
    kind: "List",
    exprs,
  };
}

export function set(exprs: readonly Node[]): Set {
  return {
    kind: "Set",
    exprs,
  };
}

export function table(kvPairs: readonly KeyValue[]): Table {
  return {
    kind: "Table",
    kvPairs,
  };
}
