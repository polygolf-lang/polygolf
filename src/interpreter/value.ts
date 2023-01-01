// TODO: include the original Type information for checking

import { PolygolfError } from "../common/errors";

export interface FunctionValue {
  kind: "function";
  value: any;
  // params:
  // TODO
}

export interface IntegerValue {
  kind: "integer";
  value: bigint;
}
export function integerValue(value: bigint): IntegerValue {
  return { kind: "integer", value };
}

export interface TextValue {
  kind: "text";
  value: string;
}
export function textValue(value: string): TextValue {
  return { kind: "text", value };
}

export interface VoidValue {
  kind: "void";
}
export const voidValue: VoidValue = { kind: "void" };

export interface BooleanValue {
  kind: "boolean";
  value: boolean;
}
export function booleanValue(value: boolean): BooleanValue {
  return { kind: "boolean", value };
}

export interface ListValue<T extends Value = Value> {
  kind: "List";
  value: T[];
}
export function listValue<T extends Value>(value: T[]): ListValue<T> {
  return { kind: "List", value };
}

export interface ArrayValue<T extends Value = Value> {
  kind: "Array";
  value: T[];
  length: number;
}
export function arrayValue<T extends Value>(
  value: T[],
  length: number
): ArrayValue<T> {
  return { kind: "Array", value, length };
}

export interface TableValue {
  kind: "Table";
  value: Map<bigint | string, Value>;
}
export function tableValue(value: Map<bigint | string, Value>): TableValue {
  return { kind: "Table", value };
}

export interface KeyValueValue {
  kind: "KeyValue";
  key: IntegerValue | TextValue;
  value: Value;
}
export function keyValueValue(
  key: IntegerValue | TextValue,
  value: Value
): KeyValueValue {
  return { kind: "KeyValue", key, value };
}

export interface SetValue {
  kind: "Set";
  value: Set<Value>;
}
export function setValue(value: Set<Value>): SetValue {
  return { kind: "Set", value };
}

export type Value =
  | FunctionValue
  | IntegerValue
  | TextValue
  | VoidValue
  | BooleanValue
  | ListValue
  | ArrayValue
  | TableValue
  | KeyValueValue
  | SetValue;

export function valuesEqual(a: Value, b: Value): boolean {
  if (a.kind === "integer" && b.kind === "integer") {
    return a.value === b.value;
  } else if (a.kind === "text" && b.kind === "text") {
    return a.value === b.value;
  } else if (a.kind === "boolean" && b.kind === "boolean") {
    return a.value === b.value;
  } else {
    throw new PolygolfError(`Incomparable: ${a.kind} and ${b.kind}`);
  }
}
