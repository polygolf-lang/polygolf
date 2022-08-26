import { BaseExpr } from "./IR";
/**
 * Program input (array of strings) as niladic variable.
 */
export interface Argv extends BaseExpr {
  type: "Argv";
}

/**
 * An identifier, such as referring to a global variable. Raw OK
 */
export interface Identifier extends BaseExpr {
  type: "Identifier";
  name: string;
}

/**
 * An unbounded integer constant. Raw OK
 */
export interface IntegerLiteral extends BaseExpr {
  type: "IntegerLiteral";
  value: BigInt;
}

/**
 * A string literal suitable for printing. Raw OK
 *
 * There is no distinction for byte vs unicode strings
 */
export interface StringLiteral extends BaseExpr {
  type: "StringLiteral";
  value: string;
}

export function id(name: string): Identifier {
  return { type: "Identifier", name };
}

export function int(value: BigInt): IntegerLiteral {
  return { type: "IntegerLiteral", value };
}

export function stringLiteral(value: string): StringLiteral {
  return { type: "StringLiteral", value };
}

export function argv(): Argv {
  return { type: "Argv" };
}
