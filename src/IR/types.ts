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
  if (a.type !== b.type) {
    throw new Error(`Cannot model union of ${toString(a)} and ${toString(b)}.`);
  }
  try {
    switch (a.type) {
      case "List": {
        if (a.member.type === "void") return b;
        if ((b as any).member.type === "void") return a;
        return listType(union(a.member, (b as any).member as ValueType));
      }
      case "Array":
        if (a.length !== (b as any).length)
          throw new Error(
            `Cannot model union of ${toString(a)} and ${toString(b)}.`
          );
        return arrayType(
          union(a.member, (b as any).member as ValueType),
          a.length
        );
      case "Set":
        if (a.member.type === "void") return b;
        if ((b as any).member.type === "void") return a;
        return setType(union(a.member, (b as any).member as ValueType));
      case "KeyValue":
        return keyValueType(
          union(a.key, (b as any).key as ValueType) as any,
          union(a.value, (b as any).value as ValueType)
        );
      case "Table":
        if (a.value.type === "void") return b;
        if ((b as any).value.type === "void") return a;
        return tableType(
          union(a.key, (b as any).key as ValueType) as any,
          union(a.value, (b as any).value as ValueType)
        );
      case "integer":
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
      case "text": {
        const t2 = b as TextType;
        return textType(
          a.capacity === undefined || t2.capacity === undefined
            ? undefined
            : Math.max(a.capacity, t2.capacity)
        );
      }
      default:
        return a;
    }
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
  if (a.type !== b.type) {
    return false;
  }
  switch (a.type) {
    case "Set":
    case "List":
      return a.member.type === "void" || isSubtype(a.member, (b as any).member);
    case "Array":
      return (
        a.length === (b as any).length && isSubtype(a.member, (b as any).member)
      );
    case "KeyValue":
      return false;
    case "Table":
      return (
        isSubtype(a.key, (b as any).key) && isSubtype(a.value, (b as any).value)
      );
    case "integer":
      return (
        b.type === "integer" &&
        (b.low === undefined || (a.low !== undefined && a.low >= b.low)) &&
        (b.high === undefined || (a.high !== undefined && b.high >= a.high))
      );
    case "text":
      return (
        b.type === "text" &&
        (b.capacity === undefined ||
          (a.capacity !== undefined && a.capacity <= b.capacity))
      );
    default:
      return true;
  }
}
