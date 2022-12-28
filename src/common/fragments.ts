import { IR } from "../IR";
import { Immutable } from "./immutable";

type imNode = Immutable<IR.Node>;

/**
 * The edge in the tree taking a Path to its child
 *
 * A string represents `node[prop]` such as `"block"` representing `program.block`
 *
 * The object represents `node[prop][index]` such as
 *  `{prop: "children", index: 3}` representing `block.children[3]`
 */
export type PathFragment =
  | string
  | {
      readonly prop: string;
      readonly index: number;
    };

export function getChild(node: imNode, pathFragment: PathFragment): imNode {
  if (typeof pathFragment === "string") {
    return (node as any)[pathFragment];
  } else {
    return (node as any)[pathFragment.prop][pathFragment.index];
  }
}

export function* getChildFragments(node: imNode): Generator<PathFragment> {
  for (const key in node) {
    const value = (node as any)[key] as imNode[] | imNode;
    if (Array.isArray(value)) {
      for (const v of value.map((_, i) => ({ prop: key, index: i }))) yield v;
    } else if (typeof value?.kind === "string" && key !== "type") {
      yield key;
    }
  }
}

export function* getChildren(node: imNode): Generator<imNode> {
  for (const fragment of getChildFragments(node))
    yield getChild(node, fragment);
}
