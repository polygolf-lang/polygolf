import { IR, Program } from "../IR";

export class Path<N extends IR.Node = IR.Node> {
  _removed = false;
  visitState: VisitState | null = null;
  root: Path<IR.Program>;

  constructor(
    public node: N,
    public parent: Path | null,
    public pathFragment: PathFragment | null
  ) {
    const root = parent?.root ?? parent ?? this;
    if (root.node.kind !== "Program")
      throw new Error(
        `Programming error: Root node should be a Program, but got ${root.node.kind}`
      );
    this.root = root as Path<IR.Program>;
  }

  /**
   * Return all children of this node as Paths. Assumes a child of a node
   * is any object entry that is an array or has a string .type.
   */
  getChildPaths(): Path[] {
    const result = [];
    for (const key in this.node) {
      const value = this.node[key] as any as IR.Node[] | IR.Node;
      if (Array.isArray(value)) {
        result.push(
          ...value.map(
            (child, i) => new Path(child, this, { prop: key, index: i })
          )
        );
      } else if (typeof value?.kind === "string" && key !== "type") {
        result.push(new Path(value, this, key));
      }
    }
    return result;
  }

  getChild(pathFragment: PathFragment): Path {
    return new Path(getChild(this.node, pathFragment), this, pathFragment);
  }

  /** Replace this node's child given by pathFragment with newChild */
  replaceChild(
    newChild: IR.Node,
    pathFragment: PathFragment,
    skipNewNode = false
  ): void {
    if (newChild.kind === "Block" && this.node.kind === "Block") {
      this.replaceChildWithMultiple(newChild.children, pathFragment);
    } else {
      const oldChild = getChild(this.node, pathFragment);
      if (this.visitState != null) {
        const queue = this.visitState.queue;
        for (let i = queue.length - 1; i >= 0; i--) {
          if (queue[i].node === oldChild) {
            queue[i]._removed = true;
            if (skipNewNode) {
              queue.splice(i, 1);
            } else {
              queue[i] = new Path(newChild, this, pathFragment);
            }
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
  }

  /** Replace this node's child given by pathFragment with newChildren */
  private replaceChildWithMultiple(
    newChildren: IR.Node[],
    pathFragment: PathFragment
  ): void {
    if (typeof pathFragment === "string")
      throw new Error("Cannot replace scalar property with multiple nodes.");
    const oldChild = getChild(this.node, pathFragment);
    if (this.visitState != null) {
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
  replaceWith(newNode: IR.Node, skipNewNode = false): void {
    this._removed = true;
    if (this.parent === null || this.pathFragment === null)
      throw new Error("Cannot replace the root node");
    return this.parent.replaceChild(newNode, this.pathFragment, skipNewNode);
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
    try {
      if (this._removed) return;
      if (visitor.enterProgram !== undefined) {
        const node = this.node;
        if (node.kind === "Program") {
          visitor.enterProgram(node);
        }
      }
      visitor.enter?.(this);
      if (this._removed) return;
      this.visitState = {
        queue: this.getChildPaths().reverse(),
      };
      let i = 1e3;
      while (this.visitState.queue.length > 0 && --i > 0) {
        const path = this.visitState.queue.at(-1)!;
        path.visit(visitor);
        if (!path._removed) {
          this.visitState.queue.pop();
        }
      }
      if (i === 0)
        throw new Error(
          `Tree visit limit hit. This is probably due to a misbehaving plugin.`
        );
      visitor.exit?.(this);
    } catch (e) {
      if (e instanceof Error && this.node.kind === "Program") {
        e.message = `Error in '${visitor.name}' visitor. ${e.message}`;
      }
      throw e;
    }
  }

  /** Returns an array of all nodes of a given type or satistifing given predicate. */
  findNodes(predicate: string | ((x: Path) => boolean)): IR.Node[] {
    const result = [];
    if (typeof predicate === "string")
      predicate = (x) => x.node.kind === predicate;
    if (predicate(this)) result.push(this.node);
    for (const child of this.getChildPaths()) {
      result.push(...child.findNodes(predicate));
    }
    return result;
  }

  /** Returns findNodes(predicate).length > 0 without enumerating all matches. */
  anyNode(predicate: string | ((x: Path) => boolean)): boolean {
    if (typeof predicate === "string")
      predicate = (x) => x.node.kind === predicate;
    if (predicate(this)) return true;
    return this.getChildPaths().some((x) => x.anyNode(predicate));
  }

  printPath(): string {
    if (this.pathFragment === null || this.parent === null) return "";
    const fragString =
      typeof this.pathFragment === "string"
        ? "." + this.pathFragment
        : "." +
          this.pathFragment.prop +
          "[" +
          this.pathFragment.index.toString() +
          "]";
    return this.parent.printPath() + fragString;
  }

  getUsedIdentifiers(): Set<string> {
    const result = new Set<string>();
    this.root.visit({
      name: "anonymous",
      enter(path: Path) {
        if (path.node.kind === "Identifier" && !path.node.builtin) {
          result.add(path.node.name);
        }
      },
    });
    return result;
  }

  getNewIdentifier(): string {
    const usedVars = this.getUsedIdentifiers();
    // try lowercase
    for (let i = "a".charCodeAt(0); i <= "z".charCodeAt(0); i++) {
      const newVar = String.fromCharCode(i);
      if (!usedVars.has(newVar)) return newVar;
    }
    // try uppercase
    for (let i = "A".charCodeAt(0); i <= "Z".charCodeAt(0); i++) {
      const newOne = String.fromCharCode(i);
      if (!usedVars.has(newOne)) return newOne;
    }
    // give up on golfing and just go for correctness
    // usedVars is a finite set, so this must terminate
    for (let i = 0; true; i++) {
      const newOne = "v" + i.toString();
      if (!usedVars.has(newOne)) return newOne;
    }
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
  name: string;
  enterProgram?: (program: Program) => void; // this is executed at the start of entering the root node
  enter?: (path: Path) => void;
  exit?: (path: Path) => void;
  generatesVariants?: boolean;
}

export function getChildren(node: IR.Node): IR.Node[] {
  const result = [];
  for (const key in node) {
    const value = node[key as keyof typeof node] as any as IR.Node[] | IR.Node;
    if (Array.isArray(value)) {
      result.push(...value);
    } else if (typeof value?.kind === "string" && key !== "type") {
      result.push(value);
    }
  }
  return result;
}
