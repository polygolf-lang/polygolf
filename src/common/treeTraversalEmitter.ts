import { Import, Node, Text } from "../IR";
import { Emitter, TokenTree } from "./Language";
import { CompilationContext } from "./compile";
import { joinTrees } from "./emit";
import { NodeKeys } from "./fragments";

type ChildrenEmitter<T extends Node> = (
  node: T,
  context: CompilationContext,
  emitter: Emitter,
) => TokenTree;

type EmitPerKindDeclaration<T extends Node = Node> = T extends Node
  ? Record<
      T["kind"],
      TokenTree | ChildrenEmitter<T> | (TokenTree | ChildrenEmitter<T>)[]
    >
  : never;

function child<Key extends NodeKeys>(key: Key) {
  return function (
    node: Node & { [key]: Node },
    context: CompilationContext,
    emitter: Emitter,
  ) {
    const child = node[key as keyof typeof node];
    if (child === undefined) return [];
    if (typeof child === "string") return child;
    return emitter(child as any as Node, context);
  };
}
function children<Key extends NodeKeys>(key: Key) {
  return function (sep: string) {
    return function (
      node: Node & { [key]: Node },
      context: CompilationContext,
      emitter: Emitter,
    ) {
      const children = node[key as keyof typeof node] as any as Node[];
      return joinTrees(
        sep,
        children.map((c) => emitter(c, context)),
      );
    };
  };
}

export const childrenEmitters: Record<
  NodeKeys,
  ChildrenEmitter<Node> | ((x: string) => ChildrenEmitter<Node>)
> = {
  alternate: child("alternate"),
  body: children("body"),
};

export function treeTraversalEmitter(declaration: EmitPerKindDeclaration) {
  function emitter(node: Node, context: CompilationContext) {
    let recipe = [declaration[x.kind]].flat();
    return recipe.map((x) =>
      typeof x === "string" ? x : x(node, context, emitter),
    );
  }
  return emitter;
}
