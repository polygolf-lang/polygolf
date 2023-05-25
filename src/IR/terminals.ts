import { BaseExpr } from "./IR";
/**
 * Program input (array of strings) as niladic variable.
 */
export interface Argv extends BaseExpr {
  readonly kind: "Argv";
}

/**
 * An identifier, such as referring to a global variable. Raw OK
 */
export interface Identifier extends BaseExpr {
  readonly kind: "Identifier";
  readonly name: string;
  readonly builtin: boolean;
}

/**
 * An unbounded integer constant. Raw OK
 */
export interface IntegerLiteral<Value extends bigint = bigint>
  extends BaseExpr {
  readonly kind: "IntegerLiteral";
  readonly value: Value;
}

/**
 * A string literal suitable for printing. Raw OK
 *
 * There is no distinction for byte vs unicode strings
 */
export interface TextLiteral extends BaseExpr {
  readonly kind: "TextLiteral";
  readonly value: string;
}

export function id(name: string, builtin: boolean = false): Identifier {
  return { kind: "Identifier", name, builtin };
}

export function int(value: bigint | number): IntegerLiteral {
  return { kind: "IntegerLiteral", value: BigInt(value) };
}

export function text(value: string): TextLiteral {
  return { kind: "TextLiteral", value };
}

export function argv(): Argv {
  return { kind: "Argv" };
}
