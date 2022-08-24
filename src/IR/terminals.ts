import { listType, simpleType, ValueType } from "./IR";
/**
 * Program input (array of strings) as niladic variable.
 */
export interface Argv {
  type: "Argv";
  valueType: ValueType;
}

/**
 * An identifier, such as referring to a global variable. Raw OK
 */
export interface Identifier {
  type: "Identifier";
  name: string;
  valueType: ValueType;
}

/**
 * An unbounded integer constant. Raw OK
 */
export interface IntegerLiteral {
  type: "IntegerLiteral";
  value: BigInt;
  valueType: ValueType;
}

/**
 * A string literal suitable for printing. Raw OK
 *
 * There is no distinction for byte vs unicode strings
 */
export interface StringLiteral {
  type: "StringLiteral";
  value: string;
  valueType: ValueType;
}

export function id(name: string, valueType = simpleType("void")): Identifier {
  return { type: "Identifier", name, valueType };
}

export function int(value: BigInt): IntegerLiteral {
  return { type: "IntegerLiteral", value, valueType: simpleType("number") };
}

export function stringLiteral(value: string): StringLiteral {
  return { type: "StringLiteral", value, valueType: simpleType("string") };
}

export function argv(): Argv {
  return { type: "Argv", valueType: listType("string") };
}
