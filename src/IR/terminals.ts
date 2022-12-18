import { BaseExpr } from "./IR";
/**
 * Program input (array of strings) as niladic variable.
 */
export interface Argv extends BaseExpr {
  kind: "Argv";
}

/**
 * An identifier, such as referring to a global variable. Raw OK
 */
export interface Identifier extends BaseExpr {
  kind: "Identifier";
  name: string;
  builtin: boolean;
}

/**
 * An unbounded integer constant. Raw OK
 */
export interface IntegerLiteral extends BaseExpr {
  kind: "IntegerLiteral";
  value: bigint;
}

/**
 * A string literal suitable for printing. Raw OK
 *
 * There is no distinction for byte vs unicode strings
 */
export interface StringLiteral extends BaseExpr {
  kind: "StringLiteral";
  value: string;
}

export function id(name: string, builtin: boolean = false): Identifier {
  return { kind: "Identifier", name, builtin };
}

export function int(value: bigint): IntegerLiteral {
  return { kind: "IntegerLiteral", value };
}

export function stringLiteral(value: string): StringLiteral {
  return { kind: "StringLiteral", value };
}

export function argv(): Argv {
  return { kind: "Argv" };
}
