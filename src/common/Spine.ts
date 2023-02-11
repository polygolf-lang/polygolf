import { IR } from "../IR";
import { getChild, getChildFragments, PathFragment } from "./fragments";
import { replaceAtIndex } from "./immutable";

/** A Spine points to one node and keeps track of all of its ancestors up to
 * the root program node. The main purpose of a Spine is for traversal. */
export class Spine<N extends IR.Node = IR.Node> {
  public readonly root: Spine<IR.Program>;

  constructor(
    public readonly node: N,
    public readonly parent: Spine | null,
    public readonly pathFragment: PathFragment | null
  ) {
    const root = parent?.root ?? parent ?? this;
    if (root.node.kind !== "Program")
      throw new Error(
        `Programming error: Root node should be a Program, but got ${root.node.kind}`
      );
    this.root = root as Spine<IR.Program>;
  }

  /** Get a list of all child spines. */
  getChildSpines(): Spine[] {
    return Array.from(getChildFragments(this.node)).map((n) =>
      this.getChild(n)
    );
  }

  /** Get one particular child spine. */
  getChild(pathFragment: PathFragment): Spine {
    return new Spine(getChild(this.node, pathFragment), this, pathFragment);
  }

  /** Return the spine (pointing to this node) determined from replacing a child
   * of this node with `newChild`. Replaces all of the ancestors of this
   * node, up to the root program, to get a fresh spine up to the program node. */
  withChildReplaced(newChild: IR.Node, pathFragment: PathFragment): Spine<N> {
    if (newChild === this.getChild(pathFragment).node) return this;
    const node =
      typeof pathFragment === "string"
        ? { ...this.node, [pathFragment]: newChild }
        : {
            ...this.node,
            [pathFragment.prop]: replaceAtIndex(
              (this.node as any)[pathFragment.prop],
              pathFragment.index,
              newChild
            ),
          };
    return new Spine(
      node,
      this.parent === null || this.pathFragment === null
        ? null
        : this.parent.withChildReplaced(node, this.pathFragment),
      this.pathFragment
    );
  }

  /** Return the spine (pointing to this node) determined from replacing this
   * node with `newNode`. Replaces all of the ancestors of this node, up to the
   * root program, to get a fresh spine up to the program node. */
  replacedWith(newNode: IR.Node): Spine {
    if (this.parent === null || this.pathFragment === null) {
      if (newNode.kind !== "Program")
        throw new Error(
          `Programming error: attempt to replace the root node ` +
            `with node of kind ${newNode.kind}`
        );
      // replace the root node
      return new Spine(newNode, null, null);
    }
    if (newNode.kind === "Block" && this.parent.node.kind === "Block") {
      throw new Error(
        `Programming error: attempt to insert a Block into a Block`
      );
    }
    return this.parent
      .withChildReplaced(newNode, this.pathFragment)
      .getChild(this.pathFragment);
  }

  /** A map of a function over all nodes in pre-order traversal order, followed
   * by removal of `undefined` return values. Returns a generator, so is a no-op
   * if the values are not used. Name inspired by Swift's `compactMap`. */
  *compactMap<T>(func: Visitor<T | undefined>): Generator<T, void, undefined> {
    const ret = func(this.node, this);
    if (ret !== undefined) yield ret;
    for (const child of this.getChildSpines()) yield* child.compactMap(func);
  }

  /** Test whether this node and all children meet the provided condition. */
  everyNode(cond: Visitor<boolean>) {
    for (const val of this.compactMap(cond)) if (!val) return false;
    return true;
  }

  /** Test whether this node, or some child, meets the provided condition. */
  someNode(cond: Visitor<boolean>) {
    for (const val of this.compactMap(cond)) if (val) return true;
    return false;
  }

  /** Return the spine (pointing to this node) determined from replacing this
   * node and all of its children with nodes given by the provided `replacer`
   * function. Replaces all of the ancestors of this node, up to the
   * root program, to get a fresh spine up to the program node.
   *
   * @param skipThis if true, does not replace this node.
   * */
  withReplacer(
    replacer: Visitor<IR.Node | undefined>,
    skipThis?: boolean
  ): Spine {
    const ret = skipThis === true ? undefined : replacer(this.node, this);
    if (ret === undefined) {
      // recurse on children
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      let curr = this as Spine;
      for (const child of this.getChildSpines()) {
        const newChild = child.withReplacer(replacer);
        if (newChild !== child) {
          curr = curr.withChildReplaced(newChild.node, child.pathFragment!);
          // Following line should be equivalent but doesn't work: (Bug?)
          //    curr = child.replacedWith(newChild.node).parent!;
        }
      }
      return curr;
    } else {
      // replace this, then recurse on children but not this
      return this.replacedWith(ret).withReplacer(replacer, true);
    }
  }
}

export type Visitor<T> = <N extends IR.Node>(node: N, spine: Spine<N>) => T;

export function programToSpine(node: IR.Program) {
  return new Spine(node, null, null);
}
