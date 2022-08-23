import { Expr, Identifier, Statement } from "./IR";

/**
 * Variants node. Variants are recursively expanded. All variants are then subject to the rest of the pipeline.
 */
export interface Variants {
  type: "Variants";
  variants: Block[];
}

/**
 * Program node. This should be the root node. Raw OK
 */
export interface Program {
  type: "Program";
  imports: Import[];
  varDeclarations: VarDeclaration[];
  block: Block;
}

/**
 * A block of several statements. Raw OK
 */
export interface Block {
  type: "Block";
  children: Statement[];
}

/**
 * A C-like if statement (not ternary expression). Raw OK
 *
 * if (condition) { consequent } else { alternate }
 */
export interface IfStatement {
  type: "IfStatement";
  condition: Expr;
  consequent: Block;
  alternate: Block;
}

/** The type of the value of a node when evaluated */
export type ValueType =
  | "number"
  | "string"
  | "boolean"
  | { type: "List"; member: ValueType }
  | { type: "Table"; key: "number" | "string"; value: ValueType }
  | { type: "Array"; member: ValueType; length: number }
  | { type: "Set"; member: ValueType };

/**
 * Variable declaration.
 */
export interface VarDeclaration {
  type: "VarDeclaration";
  variable: Identifier;
  variableType: ValueType;
}

/**
 * Import.
 */
export interface Import {
  type: "Import";
  name: string;
}
