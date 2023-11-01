import { type BaseNode, type Node } from "./IR";

/**
 * Variants node. Variants are recursively expanded. All variants are then subject to the rest of the pipeline.
 */
export interface Variants extends BaseNode {
  readonly kind: "Variants";
  readonly variants: readonly Node[];
}

/**
 * A block of several statements. Raw OK
 */
export interface Block extends BaseNode {
  readonly kind: "Block";
  readonly children: readonly Node[];
}

/**
 * A C-like if statement (not ternary expression). Raw OK
 *
 * if (condition) { consequent } else { alternate }
 */
export interface If extends BaseNode {
  readonly kind: "If";
  readonly condition: Node;
  readonly consequent: Node;
  readonly alternate?: Node;
}

export interface Import extends BaseNode {
  readonly kind: "Import";
  readonly name: string;
  readonly modules: readonly string[];
}

export function block(children: readonly Node[]): Block {
  return {
    kind: "Block",
    children: children.flatMap((x) => (x.kind === "Block" ? x.children : [x])),
  };
}

export function blockOrSingle(children: readonly Node[]): Node {
  return children.length === 1 ? children[0] : block(children);
}

export function ifStatement(
  condition: Node,
  consequent: Node,
  alternate?: Node,
): If {
  return { kind: "If", condition, consequent, alternate };
}

export function variants(variants: readonly Node[]): Variants {
  return { kind: "Variants", variants };
}

export function importStatement(
  name: string,
  modules: readonly string[],
): Import {
  return { kind: "Import", name, modules };
}
