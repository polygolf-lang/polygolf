import { BaseExpr, Expr } from "./IR";

/**
 * Variants node. Variants are recursively expanded. All variants are then subject to the rest of the pipeline.
 */
export interface Variants extends BaseExpr {
  readonly kind: "Variants";
  readonly variants: readonly Expr[];
}

/**
 * A block of several statements. Raw OK
 */
export interface Block extends BaseExpr {
  readonly kind: "Block";
  readonly children: readonly Expr[];
}

/**
 * A C-like if statement (not ternary expression). Raw OK
 *
 * if (condition) { consequent } else { alternate }
 */
export interface IfStatement extends BaseExpr {
  readonly kind: "IfStatement";
  readonly condition: Expr;
  readonly consequent: Expr;
  readonly alternate?: Expr;
}

export interface ImportStatement extends BaseExpr {
  readonly kind: "ImportStatement";
  readonly name: string;
  readonly modules: readonly string[];
}

export function block(children: readonly Expr[]): Block {
  return {
    kind: "Block",
    children: children.flatMap((x) => (x.kind === "Block" ? x.children : x)),
  };
}

export function blockOrSingle(children: readonly Expr[]): Expr {
  return children.length === 1 ? children[0] : block(children);
}

export function ifStatement(
  condition: Expr,
  consequent: Expr,
  alternate?: Expr
): IfStatement {
  return { kind: "IfStatement", condition, consequent, alternate };
}

export function variants(variants: readonly Expr[]): Variants {
  return { kind: "Variants", variants };
}

export function importStatement(
  name: string,
  modules: readonly string[]
): ImportStatement {
  return { kind: "ImportStatement", name, modules };
}
