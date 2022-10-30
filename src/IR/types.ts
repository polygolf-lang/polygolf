import { Expr } from "./IR";

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
    case "void":
      return "Void";
    case "string":
      return "Text";
    case "boolean":
      return "Bool";
    case "integer":
      return `${a.low === undefined ? "-oo" : a.low.toString()}..${
        a.low === undefined ? "oo" : a.low.toString()
      }`;
  }
  throw new Error("Unknown type.");
}

export function union(a: ValueType, b: ValueType): ValueType {
  if (a.type !== b.type) {
    throw new Error(`Cannot model union of ${toString(a)} and ${toString(b)}.`);
  }
  try {
    switch (a.type) {
      case "List":
        return listType(union(a.member, (b as any).member as ValueType));
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
        return setType(union(a.member, (b as any).member as ValueType));
      case "Table":
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
      return isSubtype(a.member, (b as any).member);
    case "Array":
      return (
        a.length === (b as any).length && isSubtype(a.member, (b as any).member)
      );
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
    default:
      return true;
  }
}
