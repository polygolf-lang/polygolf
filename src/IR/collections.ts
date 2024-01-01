import {
  type BaseNode,
  type Node,
  type KeyValue,
  Integer,
  Text,
  isOfKind,
} from "./IR";

export interface Array<T extends Node = Node> extends BaseNode {
  readonly kind: "Array";
  readonly value: readonly T[];
}

export interface List<T extends Node = Node> extends BaseNode {
  readonly kind: "List";
  readonly value: readonly T[];
}

export interface Set<T extends Node = Node> extends BaseNode {
  readonly kind: "Set";
  readonly value: readonly T[];
}

export interface Table<Key extends Node = Node, Value extends Node = Node>
  extends BaseNode {
  readonly kind: "Table";
  readonly value: readonly KeyValue<Key, Value>[];
}

export type Literal =
  | Integer
  | Text
  | Array<Literal>
  | List<Literal>
  | Set<Literal>
  | KeyValue<Literal, Literal>
  | Table<Literal, Literal>;

export function isLiteral(x: Node): x is Literal {
  return (
    isOfKind("Integer", "Text")(x) ||
    (isOfKind("List", "Array", "Set", "Table")(x) &&
      x.value.every(isLiteral)) ||
    (x.kind === "KeyValue" && isLiteral(x.key) && isLiteral(x.value))
  );
}

export function isEqualToLiteral(x: Node, literal: Literal): boolean {
  if (isOfKind("Integer", "Text")(literal)) {
    return isOfKind(literal.kind)(x) && x.value === literal.value;
  } else if (isOfKind("Array", "List", "Set", "Table")(literal)) {
    return (
      isOfKind(literal.kind)(x) &&
      x.value.every((x, i) => isEqualToLiteral(x, literal.value[i]))
    );
  }
  if (isOfKind("KeyValue")(literal)) {
    return (
      isOfKind(literal.kind)(x) &&
      isEqualToLiteral(x.key, literal.key) &&
      isEqualToLiteral(x.value, literal.value)
    );
  }
  throw new Error("Unknown literal kind.");
}

export function array(value: readonly Node[]): Array {
  return {
    kind: "Array",
    value,
  };
}

export function list(value: readonly Node[]): List {
  return {
    kind: "List",
    value,
  };
}

export function set(value: readonly Node[]): Set {
  return {
    kind: "Set",
    value,
  };
}

export function table(value: readonly KeyValue[]): Table {
  return {
    kind: "Table",
    value,
  };
}
