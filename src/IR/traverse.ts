import { IR } from ".";

export class Path<N extends IR.Node = IR.Node> {
  _removed = false;
  visitState: VisitState | null = null;
  root: Path;

  constructor(
    public node: N,
    public parent: Path | null,
    public pathFragment: PathFragment | null
  ) {
    this.root = parent?.root ?? parent ?? this;
  }

  /**
   * Return all children of this node as Paths. Assumes a child of a node
   * is any object entry that is an array or has a string .type.
   */
  getChildPaths(): Path[] {
    const result = [];
    for (let key in this.node) {
      const value = this.node[key] as any as IR.Node[] | IR.Node;
      if (Array.isArray(value)) {
        result.push(
          ...value.map(
            (child, i) => new Path(child, this, { prop: key, index: i })
          )
        );
      } else if (typeof (value as any).type === "string") {
        result.push(new Path(value, this, key));
      }
    }
    return result;
  }

  getChild(pathFragment: PathFragment): Path {
    return new Path(getChild(this.node, pathFragment), this, pathFragment);
  }

  /** Replace this node's child given by pathFragment with newChild */
  replaceChild(newChild: IR.Node, pathFragment: PathFragment): void {
    const oldChild = getChild(this.node, pathFragment);
    if (this.visitState) {
      const queue = this.visitState.queue;
      for (let i = queue.length - 1; i >= 0; i--) {
        if (queue[i].node === oldChild) {
          queue[i]._removed = true;
          queue[i] = new Path(newChild, this, pathFragment);
          break;
        }
      }
    }
    if (typeof pathFragment === "string") {
      (this.node as any)[pathFragment] = newChild;
    } else {
      (this.node as any)[pathFragment.prop][pathFragment.index] = newChild;
    }
  }

  /** Replace this node's child given by pathFragment with newChildren */
  replaceChildWithMultiple(
    newChildren: IR.Node[],
    pathFragment: PathFragment
  ): void {
    if (typeof pathFragment === "string")
      throw new Error("Cannot replace scalar property with multiple nodes.");
    const oldChild = getChild(this.node, pathFragment);
    if (this.visitState) {
      const queue = this.visitState.queue;
      for (let i = queue.length - 1; i >= 0; i--) {
        const entry = queue[i] as Path & {
          pathFragment: { index: number };
        };
        if (entry.node === oldChild) {
          entry._removed = true;
          queue.splice(
            i,
            1,
            ...[...newChildren]
              .reverse()
              .map((node) => new Path(node, this, pathFragment))
          );
        } else if (entry.pathFragment.index > pathFragment.index) {
          entry.pathFragment.index += newChildren.length - 1;
        }
      }
    }
    (this.node as any)[pathFragment.prop].splice(
      pathFragment.index,
      1,
      ...newChildren
    );
  }

  /** Replace this node with newNode by mutating the parent */
  replaceWith(newNode: IR.Node): void {
    this._removed = true;
    if (this.parent === null || this.pathFragment === null)
      throw new Error("Cannot replace the root node");
    return this.parent.replaceChild(newNode, this.pathFragment);
  }

  /** Replace this node with newNodes by mutating the parent */
  replaceWithMultiple(newNodes: IR.Node[]): void {
    this._removed = true;
    if (this.parent === null || this.pathFragment === null)
      throw new Error("Cannot replace the root node");
    return this.parent.replaceChildWithMultiple(newNodes, this.pathFragment);
  }

  /**
   * visit this node and all children nodes recursively (visitor pattern)
   *
   * It may eventually be necessary to run several plugins simultaneously
   * to avoid re-walking the tree many times (for performance). But this is
   * kept very simple for now.
   *
   * Bugs to deal with later:
   * - replacing a node with a structure that contains itself (infinite loop)
   * - more mutation issues probably
   */
  visit(visitor: Visitor): void {
    if (this._removed) return;
    visitor.enter?.(this);
    if (this._removed) return;
    this.visitState = {
      queue: this.getChildPaths().reverse(),
    };
    let i = 10;
    while (this.visitState.queue.length > 0 && --i) {
      const path = this.visitState.queue.at(-1)!;
      path.visit(visitor);
      if (!path._removed) {
        this.visitState.queue.pop();
      }
    }
    visitor.exit?.(this);
  }

  printPath(): string {
    if (this.pathFragment === null || this.parent === null) return "";
    const fragString =
      typeof this.pathFragment === "string"
        ? "." + this.pathFragment
        : "." + this.pathFragment.prop + "[" + this.pathFragment.index + "]";
    return this.parent.printPath() + fragString;
  }

  getUsedIdentifiers(): string[] {
    var result: string[] = [];
    this.root.visit({
      enter(path: Path) {
        if (path.node.type === "Identifier") {
          result.push(path.node.name);
        }
      },
    });
    return result;
  }

  getNewIdentifier(): string {
    var usedOnes = this.getUsedIdentifiers();
    var newOne = "a";
    var num = 0;
    while (usedOnes.includes(newOne)) {
      if (newOne.length === 1) {
        newOne = String.fromCharCode(newOne.charCodeAt(0) + 1);
        if (newOne === "{") {
          newOne = "v0";
        }
      } else {
        newOne = "v" + (num++).toString();
      }
    }
    return newOne;
  }
}

interface VisitState {
  // end of the queue (next to be popped) is at the end
  queue: Path[];
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

export interface Visitor {
  enter?: (path: Path) => void;
  exit?: (path: Path) => void;
}
