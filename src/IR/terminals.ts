import { type BaseNode } from "./IR";
/**
 * Program input (array of strings) as niladic variable.
 */
export interface Argv extends BaseNode {
  readonly kind: "Argv";
}

/**
 * A user identifier, such as `x` in `x=1`.
 */
export interface Identifier<Name extends string = string> extends BaseNode {
  readonly kind: "Identifier";
  readonly name: Name;
}

/**
 * A builtin, such as `print`.
 */
export interface Builtin<Name extends string = string> extends BaseNode {
  readonly kind: "Builtin";
  readonly name: Name;
}

/**
 * A reference to a SSA binding.
 */
export interface SsaRead extends BaseNode {
  readonly kind: "SsaRead";
  readonly ids: number[]; // a list of bindings this refers to (based on control flow)
}

/**
 * An SSa binding that's being defined (by assignment or for loop).
 */
export interface SsaWrite extends BaseNode {
  readonly kind: "SsaWrite";
  readonly id: number; // a list of bindings this refers to (based on control flow)
}

/**
 * An unbounded integer constant. Raw OK
 */
export interface Integer<Value extends bigint = bigint> extends BaseNode {
  readonly kind: "Integer";
  readonly value: Value;
}

/**
 * An unbounded integer constant. Raw OK
 */
export interface AnyInteger extends BaseNode {
  readonly kind: "AnyInteger";
  readonly low: bigint;
  readonly high: bigint;
}

/**
 * A string literal suitable for printing. Raw OK
 *
 * There is no distinction for byte vs unicode strings
 */
export interface Text<Value extends string = string> extends BaseNode {
  readonly kind: "Text";
  readonly value: Value;
}

export function id(name: string): Identifier {
  return { kind: "Identifier", name };
}

let unique: Record<string, number> = {};
export function uniqueId(sequenceName = "unique"): Identifier {
  if (!(sequenceName in unique)) {
    unique[sequenceName] = 0;
  }
  return id(`${sequenceName}#${unique[sequenceName]++}`);
}
export function clearUniqueSequences() {
  unique = {};
}

export function builtin(name: string): Builtin {
  return { kind: "Builtin", name };
}

export function ssaRead(ids: number[]): SsaRead {
  return { kind: "SsaRead", ids };
}

export function ssaWrite(id: number): SsaWrite {
  return { kind: "SsaWrite", id };
}

export function int(value: bigint | number): Integer {
  return { kind: "Integer", value: BigInt(value) };
}

export function anyInt(low: bigint, high: bigint): AnyInteger {
  return { kind: "AnyInteger", low, high };
}

export function text<Value extends string>(value: Value): Text<Value> {
  return { kind: "Text", value };
}

export function argv(): Argv {
  return { kind: "Argv" };
}
