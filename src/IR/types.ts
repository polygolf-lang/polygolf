import { Expr } from "./IR";

/** The type of the value of a node when evaluated */
export interface IntegerType {
  type: "integer";
  low: IntegerBound;
  high: IntegerBound;
}
export type IntegerBound = bigint | "-oo" | "oo";

export interface TextType {
  type: "text";
  capacity: number;
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

function valueType(type: ValueType | "void" | "boolean"): ValueType {
  return type === "boolean" ? booleanType : type === "void" ? voidType : type;
}

export function keyValueType(
  key: IntegerType | TextType,
  value: ValueType | "void" | "boolean"
): ValueType {
  return {
    type: "KeyValue",
    key,
    value: valueType(value),
  };
}

export function tableType(
  key: IntegerType | TextType,
  value: ValueType | "void" | "boolean"
): ValueType {
  return {
    type: "Table",
    key,
    value: valueType(value),
  };
}

export function setType(member: ValueType | "void" | "boolean"): ValueType {
  return {
    type: "Set",
    member: valueType(member),
  };
}

export function listType(member: ValueType | "void" | "boolean"): ValueType {
  return {
    type: "List",
    member: valueType(member),
  };
}

export function arrayType(
  member: ValueType | "void" | "boolean",
  length: number
): ValueType {
  return {
    type: "Array",
    member: valueType(member),
    length,
  };
}

export function integerType(
  low: IntegerBound | number = "-oo",
  high: IntegerBound | number = "oo"
): IntegerType {
  return {
    type: "integer",
    low: typeof low === "number" ? BigInt(low) : low,
    high: typeof high === "number" ? BigInt(high) : high,
  };
}

export function textType(capacity: number | IntegerBound = Infinity): TextType {
  return {
    type: "text",
    capacity:
      typeof capacity === "number"
        ? capacity
        : isFinite(capacity) && capacity < 1 << 32
        ? Number(capacity)
        : Infinity,
  };
}

export function integerTypeIncludingAll(
  ...values: IntegerBound[]
): IntegerType {
  return integerType(...integerBoundMinAndMax(values));
}

function integerBoundMinAndMax(args: IntegerBound[]) {
  return args.reduce(
    ([mn, mx], e) => {
      return [min(mn, e), max(mx, e)];
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
        ? integerType(min(a.low, b.low), max(a.high, b.high))
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
    return leq(b.low, a.low) && leq(a.high, b.high);
  }
  if (a.type === "text" && b.type === "text") {
    return a.capacity <= b.capacity;
  }
  return a.type === b.type;
}

export function abs(a: IntegerBound): IntegerBound {
  return leq(a, 0n) ? -a : a;
}
export function min(a: IntegerBound, b: IntegerBound): IntegerBound {
  return leq(a, b) ? a : b;
}
export function max(a: IntegerBound, b: IntegerBound): IntegerBound {
  return leq(a, b) ? b : a;
}
export function leq(a: IntegerBound, b: IntegerBound): boolean {
  return a === "-oo" || b === "oo" || (a !== "oo" && b !== "-oo" && a <= b);
}
export function lt(a: IntegerBound, b: IntegerBound): boolean {
  return leq(a, b) && a !== b;
}
export function neg(a: IntegerBound): IntegerBound {
  return a === "oo" ? "-oo" : a === "-oo" ? "oo" : -a;
}
export function add(a: IntegerBound, b: IntegerBound): IntegerBound {
  if (leq(b, a)) [a, b] = [b, a];
  if (a === "-oo" && b === "oo")
    throw new Error("Indeterminate result of -oo + oo.");
  if (a === "-oo") return a;
  if (b === "oo") return b;
  return (a as bigint) + (b as bigint);
}
export function sub(a: IntegerBound, b: IntegerBound): IntegerBound {
  return add(a, neg(b));
}
export function mul(a: IntegerBound, b: IntegerBound): IntegerBound {
  if (leq(b, a)) [a, b] = [b, a];
  if ((a === "-oo" && b === 0n) || (b === "oo" && a === 0n))
    throw new Error("Indeterminate result of 0 * oo.");
  if (a === "-oo") return lt(b, 0n) ? "oo" : "-oo";
  if (b === "oo") return lt(b, 0n) ? "-oo" : "oo";
  return (a as bigint) * (b as bigint);
}
export function floorDiv(a: IntegerBound, b: IntegerBound): IntegerBound {
  const res = truncDiv(a, b);
  return lt(a, 0n) !== lt(b, 0n) ? sub(res, 1n) : res;
}
export function truncDiv(a: IntegerBound, b: IntegerBound): IntegerBound {
  if (b === 0n) throw new Error("Indeterminate result of x / 0.");
  if (!isFinite(a) && !isFinite(b))
    throw new Error("Indeterminate result of +-oo / +-oo.");
  if (a === "-oo") return "-oo";
  if (a === "oo") return "oo";
  if (b === "-oo" || b === "oo") return 0n;
  return a / b;
}

export function isFinite(a: IntegerBound): a is bigint {
  return typeof a === "bigint";
}
interface FiniteIntegerType {
  type: "integer";
  low: bigint;
  high: bigint;
}
export function isFiniteType(a: IntegerType): a is FiniteIntegerType {
  return isFinite(a.low) && isFinite(a.high);
}
