import { BaseExpr, Expr, id, Identifier, Statement, ValueType } from "./IR";

/**
 * Variants node. Variants are recursively expanded. All variants are then subject to the rest of the pipeline.
 */
export interface Variants {
  type: "Variants";
  variants: Block[];
}

/**
 * A block of several statements. Raw OK
 */
export interface Block {
  type: "Block";
  children: Statement[];
  requiresBlock: boolean;
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

/**
 * Variable declaration.
 */
export interface VarDeclaration extends BaseExpr {
  type: "VarDeclaration";
  variable: Identifier;
  variableType: ValueType;
}

export interface ImportStatement extends BaseExpr {
  type: "ImportStatement";
  name: string;
  modules: string[];
}

export function block(children: Statement[]): Block {
  return { type: "Block", children, requiresBlock: children.length > 1 };
}

export function ifStatement(
  condition: Expr,
  consequent: Block,
  alternate: Block = block([])
): IfStatement {
  return { type: "IfStatement", condition, consequent, alternate };
}

export function varDeclaration(
  variable: Identifier | string,
  variableType: ValueType
): VarDeclaration {
  return {
    type: "VarDeclaration",
    variable: typeof variable === "string" ? id(variable) : variable,
    variableType,
  };
}

export function variants(variants: Block[]): Variants {
  return { type: "Variants", variants };
}

export function importStatement(
  name: string,
  modules: string[]
): ImportStatement {
  return { type: "ImportStatement", name, modules };
}
