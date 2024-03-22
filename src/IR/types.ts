import { InvariantError, UserError } from "../common/errors";
import { getType } from "../common/getType";
import { type Spine } from "../common/Spine";
import {
  type Node,
  array,
  list,
  set,
  table,
  text,
  int,
  op,
  keyValue,
} from "./IR";

/** The type of the value of a node when evaluated */
export interface IntegerType<
  Low extends IntegerBound = IntegerBound,
  High extends IntegerBound = IntegerBound,
> {
  readonly kind: "integer";
  readonly low: Low;
  readonly high: High;
}
export interface ArrayIndexType {
  readonly kind: "integer";
  readonly low: 0n;
  readonly high: bigint;
}
export type IntegerBound = bigint | "-oo" | "oo";

export interface TextType<
  Length extends IntegerType = IntegerType,
  IsAscii extends boolean = boolean,
> {
  readonly kind: "text";
  readonly codepointLength: Length;
  readonly isAscii: IsAscii;
}
export interface KeyValueType<
  Key extends IntegerType | TextType = IntegerType | TextType,
  Value extends Type = Type,
> {
  readonly kind: "KeyValue";
  readonly key: Key;
  readonly value: Value;
}
export interface FunctionType<
  Arguments extends readonly Type[] = readonly Type[],
  Result extends Type = Type,
> {
  readonly kind: "Function";
  readonly arguments: Arguments;
  readonly result: Result;
}
export interface TableType<
  Key extends IntegerType | TextType | TypeArg =
    | IntegerType
    | TextType
    | TypeArg,
  Value extends Type = Type,
> {
  kind: "Table";
  key: Key;
  value: Value;
}
export interface ArrayType<
  Member extends Type = Type,
  Length extends ArrayIndexType | TypeArg = ArrayIndexType | TypeArg,
> {
  kind: "Array";
  member: Member;
  length: Length;
}
export interface ListType<Member extends Type = Type> {
  kind: "List";
  member: Member;
}
export interface SetType<Member extends Type = Type> {
  kind: "Set";
  member: Member;
}
export interface TypeArg<Name extends string = string> {
  kind: "TypeArg";
  name: Name;
}

export type Type =
  | FunctionType
  | IntegerType
  | TextType
  | { kind: "void" }
  | { kind: "boolean" }
  | ListType
  | TableType
  | KeyValueType
  | ArrayType
  | SetType
  | TypeArg;

export const booleanType: Type = { kind: "boolean" };
export const voidType: Type = { kind: "void" };
export const int64Type: Type = integerType(
  -9223372036854775808n,
  9223372036854775807n,
);
export const int53Type: Type = integerType(
  -9007199254740992n,
  9007199254740991n,
);

export function type<T extends Type>(type: T): T;
export function type(type: Type | "void" | "boolean" | "int64" | "int53"): Type;
export function type(
  type: Type | "void" | "boolean" | "int64" | "int53",
): Type {
  switch (type) {
    case "void":
      return voidType;
    case "boolean":
      return booleanType;
    case "int64":
      return int64Type;
    case "int53":
      return int53Type;
    default:
      return type;
  }
}

export function isArrayIndexType(type: Type): type is ArrayIndexType {
  return (
    type.kind === "integer" &&
    type.low === 0n &&
    typeof type.high === "bigint" &&
    type.high >= 0n
  );
}

export function functionType<
  Arguments extends readonly Type[],
  Result extends Type,
>(args: Arguments, result: Result): FunctionType<Arguments, Result> {
  return {
    kind: "Function",
    arguments: args,
    result,
  };
}

export function keyValueType<
  Key extends IntegerType | TextType,
  Value extends Type,
>(key: Key, value: Value): KeyValueType<Key, Value> {
  return {
    kind: "KeyValue",
    key,
    value,
  };
}

export function tableType<
  Key extends IntegerType | TextType | TypeArg,
  Value extends Type,
>(key: Key, value: Value): TableType<Key, Value> {
  return {
    kind: "Table",
    key,
    value,
  };
}

export function setType<Member extends Type>(member: Member): SetType<Member> {
  return {
    kind: "Set",
    member,
  };
}

export function listType<Member extends Type>(
  member: Member,
): ListType<Member> {
  return {
    kind: "List",
    member,
  };
}

export function lengthToArrayIndexType(length: number): ArrayIndexType {
  return { kind: "integer", low: 0n, high: BigInt(length - 1) };
}

export function arrayType<
  Member extends Type,
  Length extends ArrayIndexType | TypeArg,
>(member: Member, length: Length): ArrayType<Member, Length> {
  return {
    kind: "Array",
    member: type(member),
    length,
  };
}

export function integerType(
  low: IntegerBound | number = "-oo",
  high: IntegerBound | number = "oo",
): IntegerType {
  function toIntegerBound(x: IntegerBound | number): IntegerBound {
    if (x === -Infinity || x === "-oo") return "-oo";
    if (x === Infinity || x === "oo") return "oo";
    return BigInt(x);
  }
  low = toIntegerBound(low);
  high = toIntegerBound(high);
  if (low === "oo" || high === "-oo" || lt(high, low)) {
    throw Error(`Nonsensical integer range ${low}..${high}`);
  }
  return {
    kind: "integer",
    low,
    high,
  };
}

export function constantIntegerType(c: bigint): FiniteIntegerType {
  return {
    kind: "integer",
    low: c,
    high: c,
  };
}

export function textType(
  codepointLength: IntegerType | number = integerType(0, "oo"),
  isAscii = false,
): TextType {
  if (typeof codepointLength === "number") {
    codepointLength = integerType(0n, codepointLength);
  }
  if (lt(codepointLength.low, 0n)) {
    codepointLength = integerType(0n, codepointLength.high);
  }
  return {
    kind: "text",
    codepointLength,
    isAscii,
  };
}

export function typeArg<Name extends string>(name: Name): TypeArg<Name> {
  return { kind: "TypeArg", name };
}

export const asciiType = textType(integerType(0), true);

export function integerTypeIncludingAll(
  ...values: IntegerBound[]
): IntegerType {
  return integerType(...integerBoundMinAndMax(values));
}

export function typeContains(type: IntegerType, value: IntegerBound): boolean {
  return leq(type.low, value) && leq(value, type.high);
}

function integerBoundMinAndMax(args: IntegerBound[]) {
  return args.reduce(
    ([cMin, cMax], e) => {
      return [min(cMin, e), max(cMax, e)];
    },
    [args[0], args[0]],
  );
}

export function annotate(expr: Node, type: Type): Node {
  return { ...expr, type };
}

export function bakeType(expr: Node, context: Node | Spine): Node {
  return annotate(expr, getType(expr, context));
}

export function toString(a: Type): string {
  switch (a.kind) {
    case "Function":
      return `(Func ${a.arguments.map(toString).join(" ")} ${toString(
        a.result,
      )})`;
    case "List":
      return `(List ${toString(a.member)})`;
    case "Array":
      return `(Array ${toString(a.member)} ${
        a.length.kind === "TypeArg"
          ? toString(a.length)
          : (a.length.high + 1n).toString()
      })`;
    case "Set":
      return `(Set ${toString(a.member)})`;
    case "Table":
      return `(Table ${toString(a.key)} ${toString(a.value)})`;
    case "KeyValue":
      return `(KeyValue ${toString(a.key)} ${toString(a.value)})`;
    case "void":
      return "Void";
    case "text": {
      const name = a.isAscii ? "Ascii" : "Text";
      const length = toString(a.codepointLength);
      return length === "0..oo" ? name : `(${name} ${length})`;
    }
    case "boolean":
      return "Bool";
    case "integer":
      return a.low === "-oo" && a.high === "oo"
        ? "Int"
        : `${a.low.toString()}..${a.high.toString()}`;
    case "TypeArg":
      return a.name;
  }
}

export function intersection(a: Type, b: Type): Type {
  if (a.kind === "Function" && b.kind === "Function") {
    return functionType(
      a.arguments.map((t, i) => union(t, b.arguments[i])),
      intersection(a.result, b.result),
    );
  } else if (a.kind === "List" && b.kind === "List") {
    if (a.member.kind === "void") return b;
    if (b.member.kind === "void") return a;
    return listType(intersection(a.member, b.member));
  } else if (a.kind === "Array" && b.kind === "Array") {
    if (a.length === b.length)
      return arrayType(intersection(a.member, b.member), a.length);
  } else if (a.kind === "Set" && b.kind === "Set") {
    if (a.member.kind === "void") return b;
    if (b.member.kind === "void") return a;
    return setType(intersection(a.member, b.member));
  } else if (a.kind === "KeyValue" && b.kind === "KeyValue") {
    return keyValueType(
      intersection(a.key, b.key) as any,
      intersection(a.value, b.value),
    );
  } else if (a.kind === "Table" && b.kind === "Table") {
    if (a.value.kind === "void") return b;
    if (b.value.kind === "void") return a;
    return tableType(
      intersection(a.key, b.key) as any,
      intersection(a.value, b.value),
    );
  } else if (a.kind === "integer" && b.kind === "integer") {
    const low = max(a.low, b.low);
    const high = min(a.high, b.high);
    if (leq(low, high)) return integerType(low, high);
  } else if (a.kind === "text" && b.kind === "text") {
    return textType(
      intersection(a.codepointLength, b.codepointLength) as IntegerType,
      a.isAscii || b.isAscii,
    );
  } else if (a.kind === b.kind) {
    return a;
  }
  throw new UserError("Empty intersection.", undefined);
}

export function union(a: Type, b: Type): Type {
  try {
    if (a.kind === "Function" && b.kind === "Function") {
      return functionType(
        a.arguments.map((t, i) => intersection(t, b.arguments[i])),
        union(a.result, b.result),
      );
    } else if (a.kind === "List" && b.kind === "List") {
      if (a.member.kind === "void") return b;
      if (b.member.kind === "void") return a;
      return listType(union(a.member, b.member));
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
      return textType(
        union(a.codepointLength, b.codepointLength) as IntegerType,
        a.isAscii && b.isAscii,
      );
    } else if (a.kind === b.kind) {
      return a;
    }
    throw new UserError(
      `Cannot model union of ${toString(a)} and ${toString(b)}.`,
      undefined,
    );
  } catch (e) {
    throw new UserError(
      `Cannot model union of ${toString(a)} and ${toString(b)}.\n${
        e instanceof Error ? e.message : ""
      }`,
      undefined,
    );
  }
}

/** Determines if `a` is a subtype of `b`. */
export function isSubtype(a: Type, b: Type): boolean {
  if (a.kind === "Function" && b.kind === "Function") {
    return (
      a.arguments.every((t, i) => isSubtype(b.arguments[i], t)) &&
      isSubtype(a.result, b.result)
    );
  }
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
    return (
      isSubtype(a.codepointLength, b.codepointLength) &&
      (a.isAscii || !b.isAscii)
    );
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
    throw new InvariantError("Indeterminate result of -oo + oo.");
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
    throw new InvariantError("Indeterminate result of 0 * oo.");
  if (a === "-oo") return lt(b, 0n) ? "oo" : "-oo";
  if (b === "oo") return lt(a, 0n) ? "-oo" : "oo";
  return (a as bigint) * (b as bigint);
}
export function floorDiv(a: IntegerBound, b: IntegerBound): IntegerBound {
  const res = truncDiv(a, b);
  return mul(res, b) !== a && lt(a, 0n) !== lt(b, 0n) ? sub(res, 1n) : res;
}
export function truncDiv(a: IntegerBound, b: IntegerBound): IntegerBound {
  if (b === 0n) throw new InvariantError("Indeterminate result of x / 0.");
  if (!isFiniteBound(a) && !isFiniteBound(b))
    throw new InvariantError("Indeterminate result of +-oo / +-oo.");
  if (!isFiniteBound(a)) {
    if (lt(a, 0n) === lt(b, 0n)) return "oo";
    else return "-oo";
  }
  if (b === "-oo" || b === "oo") return 0n;
  return a / b;
}

export function isFiniteBound(a: IntegerBound): a is bigint {
  return typeof a === "bigint";
}
export interface FiniteIntegerType {
  kind: "integer";
  low: bigint;
  high: bigint;
}
export function isFiniteType(a: IntegerType): a is FiniteIntegerType {
  return isFiniteBound(a.low) && isFiniteBound(a.high);
}
export function isConstantType(a: IntegerType): a is FiniteIntegerType {
  return isFiniteType(a) && a.low === a.high;
}

export function defaultValue(a: Type): Node {
  switch (a.kind) {
    case "Array":
      return array([]);
    case "List":
      return list([]);
    case "Set":
      return set([]);
    case "Table":
      return table([]);
    case "text":
      if (
        isFiniteBound(a.codepointLength.low) &&
        a.codepointLength.low < 2 ** 32
      ) {
        return text(" ".repeat(Number(a.codepointLength.low)));
      }
      break;
    case "integer":
      if (lt(a.high, 0n)) return int(a.high as bigint);
      if (lt(0n, a.low)) return int(a.low as bigint);
      return int(0);
  }
  throw new InvariantError(`Unsupported default value for type ${toString(a)}`);
}

export function instantiateGenerics(
  typeParams: Record<string, Type>,
): (type: Type) => Type {
  function instantiate(type: Type): Type {
    switch (type.kind) {
      case "Array": {
        const lengthType = instantiate(type.length);
        if (lengthType.kind !== "TypeArg" && !isArrayIndexType(lengthType))
          throw new InvariantError(
            "Array type's second argument must be a constant integer type.",
          );
        return arrayType(instantiate(type.member), lengthType);
      }
      case "Function":
        return functionType(
          type.arguments.map(instantiate),
          instantiate(type.result),
        );
      case "KeyValue": {
        const keyType = instantiate(type.key);
        if (keyType.kind !== "integer" && keyType.kind !== "text")
          throw new InvariantError(
            "KeyValue type's first argument must be an integer or text type.",
          );
        return keyValueType(keyType, instantiate(type.value));
      }
      case "Table": {
        const keyType = instantiate(type.key);
        if (
          keyType.kind !== "integer" &&
          keyType.kind !== "text" &&
          keyType.kind !== "TypeArg"
        )
          throw new InvariantError(
            "Table type's first argument must be an integer or text type.",
          );
        return tableType(keyType, instantiate(type.value));
      }
      case "List":
        return listType(instantiate(type.member));
      case "Set":
        return setType(instantiate(type.member));
      case "boolean":
      case "integer":
      case "text":
      case "void":
        return type;
      case "TypeArg":
        return typeParams[type.name] ?? type;
    }
  }
  return instantiate;
}

export function getLiteralOfType(type: Type, nonEmpty = false): Node {
  switch (type.kind) {
    case "text":
      return text(nonEmpty ? "x" : "");
    case "integer":
      return int(
        leq(type.low, 1n) && leq(1n, type.high)
          ? 1n
          : type.low === "-oo"
            ? (type.high as bigint)
            : (type.low as bigint),
      );
    case "boolean":
      return op.true;
    case "Array":
      if (isArrayIndexType(type.length))
        return array(
          Array(Number(type.length.high) - 1).fill(
            getLiteralOfType(type.member, nonEmpty),
          ),
        );
      break;
    case "List":
      return list(nonEmpty ? [getLiteralOfType(type.member, nonEmpty)] : []);
    case "Set":
      return set(nonEmpty ? [getLiteralOfType(type.member, nonEmpty)] : []);
    case "Table":
      return table(
        nonEmpty
          ? [
              keyValue(
                getLiteralOfType(type.key, nonEmpty),
                getLiteralOfType(type.value, nonEmpty),
              ),
            ]
          : [],
      );
  }
  throw new InvariantError(`There's no literal of type '${type.kind}'.`);
}
