import { Expr } from "./IR";

/** The type of the value of a node when evaluated */
export interface IntegerType {
  type: "integer";
  low?: bigint;
  high?: bigint;
}
export interface TextType {
  type: "text";
  capacity?: number;
}
export interface KeyValueType {
  type: "KeyValue";
  key: IntegerType | TextType;
  value: ValueType;
}
export type ValueType =
  | IntegerType
  | TextType
  | { type: "void" }
  | { type: "boolean" }
  | { type: "List"; member: ValueType }
  | { type: "Table"; key: IntegerType | TextType; value: ValueType }
  | KeyValueType
  | { type: "Array"; member: ValueType; length: number }
  | { type: "Set"; member: ValueType };

export const booleanType: ValueType = { type: "boolean" };
export const voidType: ValueType = { type: "void" };

export function keyValueType(
  key: IntegerType | TextType,
  value: ValueType | "void" | "boolean"
): ValueType {
  return {
    type: "KeyValue",
    key,
    value:
      value === "boolean" ? booleanType : value === "void" ? voidType : value,
  };
}

export function tableType(
  key: IntegerType | TextType,
  value: ValueType | "void" | "boolean"
): ValueType {
  return {
    type: "Table",
    key,
    value:
      value === "boolean" ? booleanType : value === "void" ? voidType : value,
  };
}

export function setType(member: ValueType | "void" | "boolean"): ValueType {
  return {
    type: "Set",
    member:
      member === "boolean"
        ? booleanType
        : member === "void"
        ? voidType
        : member,
  };
}

export function listType(member: ValueType | "void" | "boolean"): ValueType {
  return {
    type: "List",
    member:
      member === "boolean"
        ? booleanType
        : member === "void"
        ? voidType
        : member,
  };
}

export function arrayType(
  member: ValueType | "void" | "boolean",
  length: number
): ValueType {
  return {
    type: "Array",
    member:
      member === "boolean"
        ? booleanType
        : member === "void"
        ? voidType
        : member,
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

export function textType(capacity?: bigint | number): TextType {
  return {
    type: "text",
    capacity:
      typeof capacity === "bigint"
        ? Number(BigInt.asIntN(32, capacity))
        : capacity,
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

export function annotate(expr: Expr, valueType: ValueType): Expr {
  return { ...expr, valueType };
}

export function toString(a: ValueType): string {
  switch (a.type) {
    case "List":
      return `(List ${toString(a.member)})`;
    case "Array":
      return `(Array ${toString(a.member)} ${a.length})`;
    case "Set":
      return `(Set ${toString(a.member)})`;
    case "Table":
      return `(Table ${toString(a.key)} ${toString(a.value)})`;
    case "KeyValue":
      return `(KeyValue ${toString(a.key)} ${toString(a.value)})`;
    case "void":
      return "Void";
    case "text":
      return a.capacity === undefined ? "Text" : `(Text ${a.capacity})`;
    case "boolean":
      return "Bool";
    case "integer":
      return `${a.low === undefined ? "-oo" : a.low.toString()}..${
        a.high === undefined ? "oo" : a.high.toString()
      }`;
  }
}

export function union(a: ValueType, b: ValueType): ValueType {
  try {
    if (a.type === "List" && b.type === "List") {
      if (a.member.type === "void") return b;
      if (b.member.type === "void") return a;
      return listType(union(a.member, b.member as ValueType));
    } else if (a.type === "Array" && b.type === "Array") {
      if (a.length === b.length)
        return arrayType(union(a.member, b.member), a.length);
    } else if (a.type === "Set" && b.type === "Set") {
      if (a.member.type === "void") return b;
      if (b.member.type === "void") return a;
      return setType(union(a.member, b.member));
    } else if (a.type === "KeyValue" && b.type === "KeyValue") {
      return keyValueType(union(a.key, b.key) as any, union(a.value, b.value));
    } else if (a.type === "Table" && b.type === "Table") {
      if (a.value.type === "void") return b;
      if (b.value.type === "void") return a;
      return tableType(union(a.key, b.key) as any, union(a.value, b.value));
    } else if (a.type === "integer" && b.type === "integer") {
      return b.type === "integer"
        ? integerType(
            a.low === undefined || b.low === undefined
              ? undefined
              : a.low < b.low
              ? a.low
              : b.low,
            a.high === undefined || b.high === undefined
              ? undefined
              : a.high < b.high
              ? b.high
              : a.high
          )
        : integerType();
    } else if (a.type === "text" && b.type === "text") {
      return textType(
        a.capacity === undefined || b.capacity === undefined
          ? undefined
          : Math.max(a.capacity, b.capacity)
      );
    } else if (a.type === b.type) {
      return a;
    }
    throw new Error(`Cannot model union of ${toString(a)} and ${toString(b)}.`);
  } catch (e) {
    throw new Error(
      `Cannot model union of ${toString(a)} and ${toString(b)}.\n${
        e instanceof Error ? e.message : ""
      }`
    );
  }
}

/** Determines if `a` is a subtype of `b`. */
export function isSubtype(a: ValueType, b: ValueType): boolean {
  if (
    (a.type === "Set" && b.type === "Set") ||
    (a.type === "List" && b.type === "List")
  ) {
    return a.member.type === "void" || isSubtype(a.member, b.member);
  }
  if (a.type === "Array" && b.type === "Array") {
    return a.length === b.length && isSubtype(a.member, b.member);
  }
  if (a.type === "KeyValue" && b.type === "KeyValue") return false;
  if (a.type === "Table" && b.type === "Table") {
    return isSubtype(a.key, b.key) && isSubtype(a.value, b.value);
  }
  if (a.type === "integer" && b.type === "integer") {
    return (
      (b.low === undefined || (a.low !== undefined && a.low >= b.low)) &&
      (b.high === undefined || (a.high !== undefined && b.high >= a.high))
    );
  }
  if (a.type === "text" && b.type === "text") {
    return (
      b.type === "text" &&
      (b.capacity === undefined ||
        (a.capacity !== undefined && a.capacity <= b.capacity))
    );
  }
  return a.type === b.type;
}
