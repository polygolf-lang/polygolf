/** The type of the value of a node when evaluated */
export interface IntegerType {
  type: "integer";
  low?: bigint;
  high?: bigint;
}
export type ValueType =
  | { type: "void" }
  | IntegerType
  | { type: "string" }
  | { type: "boolean" }
  | { type: "List"; member: ValueType }
  | { type: "Table"; key: IntegerType | { type: "string" }; value: ValueType }
  | { type: "Array"; member: ValueType; length: number }
  | { type: "Set"; member: ValueType };

export function simpleType<T extends "void" | "string" | "boolean">(type: T) {
  return { type };
}

export function tableType(
  key: IntegerType | "string",
  value: ValueType | "void" | "string" | "boolean"
): ValueType {
  return {
    type: "Table",
    key: key === "string" ? simpleType(key) : key,
    value: typeof value === "string" ? simpleType(value) : value,
  };
}

export function setType(
  member: ValueType | "void" | "string" | "boolean"
): ValueType {
  return {
    type: "Set",
    member: typeof member === "string" ? simpleType(member) : member,
  };
}

export function listType(
  member: ValueType | "void" | "string" | "boolean"
): ValueType {
  return {
    type: "List",
    member: typeof member === "string" ? simpleType(member) : member,
  };
}

export function arrayType(
  member: ValueType | "void" | "string" | "boolean",
  length: number
): ValueType {
  return {
    type: "Array",
    member: typeof member === "string" ? simpleType(member) : member,
    length,
  };
}

export function integerType(
  low?: bigint | number,
  high?: bigint | number
): IntegerType {
  return {
    type: "integer",
    low: typeof low === "number" ? BigInt(low) : low,
    high: typeof high === "number" ? BigInt(high) : high,
  };
}

export function integerTypeIncludingAll(values: bigint[]): IntegerType {
  return integerType(...bigIntMinAndMax(values));
}

function bigIntMinAndMax(args: bigint[]) {
  return args.reduce(
    ([min, max], e) => {
      return [e < min ? e : min, e > max ? e : max];
    },
    [args[0], args[0]]
  );
}
