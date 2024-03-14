import { type IR } from "../IR";

export type ChildProp<T = IR.Node> = NonNullable<
  T extends IR.Node
    ? { [K in keyof T]: T[K] extends IR.Node ? K : never }[keyof T]
    : never
>;

export type ChildrenProp<T = IR.Node> = NonNullable<
  T extends IR.Node
    ? { [K in keyof T]: T[K] extends readonly IR.Node[] ? K : never }[keyof T]
    : never
>;

export type NodeProp<T = IR.Node> = ChildProp<T> | ChildrenProp<T>;

/**
 * The edge in the tree taking a Path to its child
 *
 * `undefined` index represents `node[prop]` such as `{prop: "expr"}` representing `assignment.expr`
 *
 * Otherwise, it represents `node[prop][index]` such as
 *  `{prop: "children", index: 3}` representing `block.children[3]`
 */
export type PathFragment =
  | {
      readonly prop: ChildProp;
      readonly index?: undefined;
    }
  | {
      readonly prop: ChildrenProp;
      readonly index: number;
    };

export interface ChildrenPropWithDelimiter {
  readonly prop: ChildrenProp;
  readonly delimiter: string | undefined;
}

export function getChild(node: IR.Node, pathFragment: PathFragment): IR.Node {
  if (pathFragment.index === undefined) {
    return (node as any)[pathFragment.prop];
  } else {
    return (node as any)[pathFragment.prop][pathFragment.index];
  }
}

/** Get all keys of a node object corresponding to children nodes. This is the
 * same sequence as `getChildFragments`, but this gives one key for each
 * array prop, while `getChildFragments` gives a `PathFragment` for each entry */
function* getChildKeys(node: IR.Node): Generator<NodeProp> {
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
      for (const v of value
        .filter((x) => typeof x === "object")
        .map((_, i) => ({ prop: key as ChildrenProp, index: i })))
        yield v;
    } else {
      yield { prop: key as ChildProp };
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
  func: (frag: PathFragment) => IR.Node,
): IR.Node {
  const newNode: any = { ...node };
  let changed = false;
  for (const key of getChildKeys(node)) {
    const value = (node as any)[key] as IR.Node[] | IR.Node;
    if (Array.isArray(value)) {
      newNode[key] = [];
      value.forEach((n, i) => {
        const m = func({ prop: key as ChildrenProp, index: i });
        if (m !== n) changed = true;
        if (m.kind === "Block" && node.kind === "Block") {
          newNode[key].push(...m.children);
        } else {
          newNode[key].push(m);
        }
      });
    } else {
      changed = true;
      newNode[key] = func({ prop: key as ChildProp });
    }
  }
  if (!changed) return node;
  return newNode;
}

const childProps = [
  "alternate",
  "append",
  "arg",
  "assignment",
  "body",
  "collection",
  "condition",
  "consequent",
  "expr",
  "func",
  "high",
  "ident",
  "index",
  "init",
  "key",
  "low",
  "object",
  "step",
  "value",
  "variable",
] as const satisfies readonly ChildProp[];

const childrenProps = [
  "args",
  "children",
  "exprs",
  "value",
  "variables",
  "variants",
] as const satisfies readonly ChildrenProp[];

export const $: { [K in ChildProp]: { prop: K } } & {
  [K in ChildrenProp]: {
    join: (delimiter?: string) => { prop: K; delimiter: string | undefined };
    at: (index: number) => { prop: K; index: number };
  };
} = {
  ...Object.fromEntries(childProps.map((prop) => [prop, { prop }])),
  ...Object.fromEntries(
    childrenProps.map((prop) => [
      prop,
      {
        join(delimiter: string) {
          return { prop, delimiter };
        },
        at(index: number) {
          return { prop, index };
        },
        prop,
      },
    ]),
  ),
} as any;
