import { IR } from "../IR";

/**
 * The edge in the tree taking a Path to its child
 *
 * A string represents `node[prop]` such as `"block"` representing `program.block`
 *
 * The object represents `node[prop][index]` such as
 *  `{prop: "children", index: 3}` representing `block.children[3]`
 */
type AllKeys<T> = T extends unknown ? keyof T : never;

export type PathFragment =
  | AllKeys<IR.Node>
  | {
      readonly prop: AllKeys<IR.Node>;
      readonly index: number;
    };

export function getChild(node: IR.Node, pathFragment: PathFragment): IR.Node {
  if (typeof pathFragment === "string") {
    return (node as any)[pathFragment];
  } else {
    return (node as any)[pathFragment.prop][pathFragment.index];
  }
}

/** Get all keys of a node object corresponding to children nodes. This is the
 * same sequence as `getChildFragments`, but this gives one key for each
 * array prop, while `getChildFragments` gives a `PathFragment` for each entry */
function* getChildKeys(node: IR.Node): Generator<AllKeys<IR.Node>> {
  for (const key in node) {
    const value = (node as any)[key];
    if (
      Array.isArray(value) ||
      (typeof value?.kind === "string" && key !== "type")
    ) {
      yield key as any;
    }
  }
}

/** Get all `PathFragment`s pointing to child nodes, so `getChild(node, frag)`
 * enumerates all children of `node` if `frag` loops over `getChildFragments(node)` */
export function* getChildFragments(node: IR.Node): Generator<PathFragment> {
  for (const key of getChildKeys(node)) {
    const value = (node as any)[key] as IR.Node[] | IR.Node;
    if (Array.isArray(value)) {
      for (const v of value.map((_, i) => ({ prop: key, index: i }))) yield v;
    } else {
      yield key;
    }
  }
}

export function* getChildren(node: IR.Node): Generator<IR.Node> {
  for (const fragment of getChildFragments(node))
    yield getChild(node, fragment);
}

/** Get a new node by replacing all of `node`'s children, but preserve the rest
 * of `node`'s properties such as boolean flags and string opcodes. */
export function fromChildRemapFunc(
  node: IR.Node,
  func: (frag: PathFragment) => IR.Node
): IR.Node {
  const newNode: any = { ...node };
  let changed = false;
  for (const key of getChildKeys(node)) {
    const value = (node as any)[key] as IR.Node[] | IR.Node;
    if (Array.isArray(value)) {
      newNode[key] = [];
      value.forEach((n, i) => {
        const m = func({ prop: key, index: i });
        if (m !== n) changed = true;
        if (m.kind === "Block" && node.kind === "Block") {
          newNode[key].push(...m.children);
        } else {
          newNode[key].push(m);
        }
      });
    } else {
      changed = true;
      newNode[key] = func(key);
    }
  }
  if (!changed) return node;
  return newNode;
}
