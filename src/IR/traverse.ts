import { IR } from ".";

export class Path<N extends IR.Node = IR.Node> {
  constructor(
    public node: N,
    public parent: Path | null,
    public pathFragment: PathFragment | null
  ) {}

  /**
   * Return all children of this node as Paths. Assumes a child of a node
   * is any object entry that is an array or has a string .type.
   */
  getChildPaths(): Path[] {
    const result = [];
    for (let key in this.node) {
      const value = this.node[key];
      if (Array.isArray(value)) {
        // value: IR.Node[]
        result.push(
          ...(value as IR.Node[]).map(
            (child, i) => new Path(child, this, { prop: key, index: i })
          )
        );
      } else if (typeof (value as any).type === "string") {
        // value: IR.Node
        result.push(new Path(value as any as IR.Node, this, key));
      }
    }
    return result;
  }

  /** Replace this node's child given by pathFragment with newChild */
  replaceChild(newChild: IR.Node, pathFragment: PathFragment): void {
    if (typeof pathFragment === "string") {
      (this.node as any)[pathFragment] = newChild;
    } else {
      (this.node as any)[pathFragment.prop][pathFragment.index] = newChild;
    }
  }

  /** Replace this node with newNode by mutating the parent */
  replaceWith(newNode: IR.Node): void {
    if (this.parent === null || this.pathFragment === null)
      throw new Error("Cannot replace the root node");
    return this.parent.replaceChild(newNode, this.pathFragment);
  }

  /**
   * visit this node and all children nodes recursively (visitor pattern)
   *
   * It may eventually be necessary to add separate enter() and exit()
   * hooks for functionality, or to run several plugins simultaneously
   * to avoid re-walking the tree many times (for performance). But this is
   * kept very simple for now.
   *
   * Bugs to deal with later:
   * - replacing a node with a structure that contains itself (infinite loop)
   * - more mutation issues probably
   */
  visit(visitor: (node: Path) => void): void {
    visitor(this);
    this.getChildPaths().forEach((path) => path.visit(visitor));
  }
}

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
      prop: string;
      index: number;
    };

export function getChild(node: IR.Node, pathFragment: PathFragment): IR.Node {
  if (typeof pathFragment === "string") {
    return (node as any)[pathFragment];
  } else {
    return (node as any)[pathFragment.prop][pathFragment.index];
  }
}

export function programToPath(node: IR.Program) {
  return new Path(node, null, null);
}
