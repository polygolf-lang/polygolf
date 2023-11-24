import { type BaseNode } from "./IR";
/**
 * Program input (array of strings) as niladic variable.
 */
export interface Argv extends BaseNode {
  readonly kind: "Argv";
}

/**
 * An identifier, such as referring to a global variable. Raw OK
 */
export interface Identifier<
  Builtin extends boolean = boolean,
  Name extends string = string,
> extends BaseNode {
  readonly kind: "Identifier";
  readonly name: Name;
  readonly builtin: Builtin;
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

let unique = 0;
export function id(name?: string, builtin: boolean = false): Identifier {
  return { kind: "Identifier", name: name ?? `unique#${unique++}`, builtin };
}

export function builtin(name: string): Identifier {
  return id(name, true);
}

export function int(value: bigint | number): Integer {
  return { kind: "Integer", value: BigInt(value) };
}

export function anyInt(low: bigint, high: bigint): AnyInteger {
  return { kind: "AnyInteger", low, high };
}

export function text(value: string): Text {
  return { kind: "Text", value };
}

export function argv(): Argv {
  return { kind: "Argv" };
}
