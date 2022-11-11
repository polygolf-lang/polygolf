import { Expr } from "./IR";

/** The type of the value of a node when evaluated */
export interface IntegerType {
  kind: "integer";
  low: IntegerBound;
  high: IntegerBound;
}
export type IntegerBound = bigint | "-oo" | "oo";

export interface TextType {
  kind: "text";
  capacity: number;
}
export interface KeyValueType {
  kind: "KeyValue";
  key: IntegerType | TextType;
  value: ValueType;
}
export type ValueType =
  | IntegerType
  | TextType
  | { kind: "void" }
  | { kind: "boolean" }
  | { kind: "List"; member: ValueType }
  | { kind: "Table"; key: IntegerType | TextType; value: ValueType }
  | KeyValueType
  | { kind: "Array"; member: ValueType; length: number }
  | { kind: "Set"; member: ValueType };

export const booleanType: ValueType = { kind: "boolean" };
export const voidType: ValueType = { kind: "void" };

function valueType(type: ValueType | "void" | "boolean"): ValueType {
  return type === "boolean" ? booleanType : type === "void" ? voidType : type;
}

export function keyValueType(
  key: IntegerType | TextType,
  value: ValueType | "void" | "boolean"
): ValueType {
  return {
    kind: "KeyValue",
    key,
    value: valueType(value),
  };
}

export function tableType(
  key: IntegerType | TextType,
  value: ValueType | "void" | "boolean"
): ValueType {
  return {
    kind: "Table",
    key,
    value: valueType(value),
  };
}

export function setType(member: ValueType | "void" | "boolean"): ValueType {
  return {
    kind: "Set",
    member: valueType(member),
  };
}

export function listType(member: ValueType | "void" | "boolean"): ValueType {
  return {
    kind: "List",
    member: valueType(member),
  };
}

export function arrayType(
  member: ValueType | "void" | "boolean",
  length: number
): ValueType {
  return {
    kind: "Array",
    member: valueType(member),
    length,
  };
}

export function integerType(
  low: IntegerBound | number = "-oo",
  high: IntegerBound | number = "oo"
): IntegerType {
  function toIntegerBound(x: IntegerBound | number): IntegerBound {
    if (x === -Infinity || x === "-oo") return "-oo";
    if (x === Infinity || x === "oo") return "oo";
    return BigInt(x);
  }
  return {
    kind: "integer",
    low: toIntegerBound(low),
    high: toIntegerBound(high),
  };
}

export function textType(capacity: number | IntegerBound = Infinity): TextType {
  return {
    kind: "text",
    capacity:
      typeof capacity === "number"
        ? Math.max(0, capacity)
        : lt(capacity, 0n)
        ? 0
        : isFinite(capacity) && capacity < BigInt(2 ** 32)
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
  return { ...expr, type: valueType };
}

export function toString(a: ValueType): string {
  switch (a.kind) {
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
      return a.capacity === Infinity ? "Text" : `(Text ${a.capacity})`;
    case "boolean":
      return "Bool";
    case "integer":
      return `${a.low.toString()}..${a.high.toString()}`;
  }
}

export function union(a: ValueType, b: ValueType): ValueType {
  try {
    if (a.kind === "List" && b.kind === "List") {
      if (a.member.kind === "void") return b;
      if (b.member.kind === "void") return a;
      return listType(union(a.member, b.member as ValueType));
    } else if (a.kind === "Array" && b.kind === "Array") {
      if (a.length === b.length)
        return arrayType(union(a.member, b.member), a.length);
    } else if (a.kind === "Set" && b.kind === "Set") {
      if (a.member.kind === "void") return b;
      if (b.member.kind === "void") return a;
      return setType(union(a.member, b.member));
    } else if (a.kind === "KeyValue" && b.kind === "KeyValue") {
      return keyValueType(union(a.key, b.key) as any, union(a.value, b.value));
    } else if (a.kind === "Table" && b.kind === "Table") {
      if (a.value.kind === "void") return b;
      if (b.value.kind === "void") return a;
      return tableType(union(a.key, b.key) as any, union(a.value, b.value));
    } else if (a.kind === "integer" && b.kind === "integer") {
      return b.kind === "integer"
        ? integerType(min(a.low, b.low), max(a.high, b.high))
        : integerType();
    } else if (a.kind === "text" && b.kind === "text") {
      return textType(Math.max(a.capacity, b.capacity));
    } else if (a.kind === b.kind) {
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
    (a.kind === "Set" && b.kind === "Set") ||
    (a.kind === "List" && b.kind === "List")
  ) {
    return a.member.kind === "void" || isSubtype(a.member, b.member);
  }
  if (a.kind === "Array" && b.kind === "Array") {
    return a.length === b.length && isSubtype(a.member, b.member);
  }
  if (a.kind === "KeyValue" && b.kind === "KeyValue") return false;
  if (a.kind === "Table" && b.kind === "Table") {
    return isSubtype(a.key, b.key) && isSubtype(a.value, b.value);
  }
  if (a.kind === "integer" && b.kind === "integer") {
    return leq(b.low, a.low) && leq(a.high, b.high);
  }
  if (a.kind === "text" && b.kind === "text") {
    return a.capacity <= b.capacity;
  }
  return a.kind === b.kind;
}

export function abs(a: IntegerBound): IntegerBound {
  return leq(a, 0n) ? neg(a) : a;
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
  if (b === "oo") return lt(a, 0n) ? "-oo" : "oo";
  return (a as bigint) * (b as bigint);
}
export function floorDiv(a: IntegerBound, b: IntegerBound): IntegerBound {
  const res = truncDiv(a, b);
  return mul(res, b) !== a && lt(a, 0n) !== lt(b, 0n) ? sub(res, 1n) : res;
}
export function truncDiv(a: IntegerBound, b: IntegerBound): IntegerBound {
  if (b === 0n) throw new Error("Indeterminate result of x / 0.");
  if (!isFinite(a) && !isFinite(b))
    throw new Error("Indeterminate result of +-oo / +-oo.");
  if (!isFinite(a)) {
    if (lt(a, 0n) === lt(b, 0n)) return "oo";
    else return "-oo";
  }
  if (b === "-oo" || b === "oo") return 0n;
  return a / b;
}

export function isFinite(a: IntegerBound): a is bigint {
  return typeof a === "bigint";
}
interface FiniteIntegerType {
  kind: "integer";
  low: bigint;
  high: bigint;
}
export function isFiniteType(a: IntegerType): a is FiniteIntegerType {
  return isFinite(a.low) && isFinite(a.high);
}
