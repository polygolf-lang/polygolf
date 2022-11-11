import { BaseExpr, Expr, id, Identifier, ValueType } from "./IR";

/**
 * Variants node. Variants are recursively expanded. All variants are then subject to the rest of the pipeline.
 */
export interface Variants extends BaseExpr {
  kind: "Variants";
  variants: Expr[];
}

/**
 * A block of several statements. Raw OK
 */
export interface Block extends BaseExpr {
  kind: "Block";
  children: Expr[];
}

/**
 * A C-like if statement (not ternary expression). Raw OK
 *
 * if (condition) { consequent } else { alternate }
 */
export interface IfStatement extends BaseExpr {
  kind: "IfStatement";
  condition: Expr;
  consequent: Expr;
  alternate?: Expr;
}

/**
 * Variable declaration.
 */
export interface VarDeclaration extends BaseExpr {
  kind: "VarDeclaration";
  variable: Identifier;
  variableType: ValueType;
}

export interface ImportStatement extends BaseExpr {
  kind: "ImportStatement";
  name: string;
  modules: string[];
}

export function block(children: Expr[]): Block {
  return { kind: "Block", children };
}

export function blockOrSingle(children: Expr[]): Expr {
  return children.length === 1 ? children[0] : block(children);
}

export function ifStatement(
  condition: Expr,
  consequent: Expr,
  alternate?: Expr
): IfStatement {
  return { kind: "IfStatement", condition, consequent, alternate };
}

export function varDeclaration(
  variable: Identifier | string,
  variableType: ValueType
): VarDeclaration {
  return {
    kind: "VarDeclaration",
    variable: typeof variable === "string" ? id(variable) : variable,
    variableType,
  };
}

export function variants(variants: Expr[]): Variants {
  return { kind: "Variants", variants };
}

export function importStatement(
  name: string,
  modules: string[]
): ImportStatement {
  return { kind: "ImportStatement", name, modules };
}
