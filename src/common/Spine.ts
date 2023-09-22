import { Expr, IR, isPolygolfOp, polygolfOp } from "../IR";
import { CompilationContext } from "./compile";
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

  get depth(): number {
    return this.parent === null ? 0 : 1 + this.parent.depth;
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
   * root program, to get a fresh spine up to the program node.
   * If `canonizeAndReturnRoot`, all `PolygolfOp`s up to the root are canonized
   * and the root spine is returned. */
  replacedWith(newNode: IR.Node, canonizeAndReturnRoot = false): Spine {
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
    const parentNode = this.parent.node;
    const parent =
      canonizeAndReturnRoot &&
      isPolygolfOp()(parentNode) &&
      typeof this.pathFragment === "object"
        ? this.parent.replacedWith(
            polygolfOp(
              parentNode.op,
              ...(replaceAtIndex(
                parentNode.args,
                this.pathFragment.index,
                newNode
              ) as Expr[])
            ),
            true
          )
        : this.parent.withChildReplaced(newNode, this.pathFragment);
    return canonizeAndReturnRoot
      ? parent.root
      : parent.getChild(this.pathFragment);
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
   * @param skipReplaced if true, does not recurse onto children of freshly replaced node
   * */
  withReplacer(
    replacer: Visitor<IR.Node | undefined>,
    skipThis = false,
    skipReplaced = false
  ): Spine {
    const ret = skipThis ? undefined : replacer(this.node, this);
    if (ret === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      let curr = this as Spine;
      // recurse on children
      if (isPolygolfOp()(this.node)) {
        // Create canonical PolygolfOp instead of just replacing the chidren
        const newChildren: Expr[] = [];
        let someChildrenIsNew = false;
        for (const child of this.getChildSpines()) {
          const newChild = child.withReplacer(replacer, false, skipReplaced);
          newChildren.push(newChild.node as Expr);
          someChildrenIsNew ||= newChild !== child;
        }
        if (someChildrenIsNew)
          curr = curr.replacedWith(polygolfOp(this.node.op, ...newChildren));
      } else {
        for (const child of this.getChildSpines()) {
          const newChild = child.withReplacer(replacer, false, skipReplaced);
          if (newChild !== child) {
            curr = curr.withChildReplaced(newChild.node, child.pathFragment!);
            // Following line should be equivalent but doesn't work: (Bug?)
            //    curr = child.replacedWith(newChild.node).parent!;
          }
        }
      }
      return curr;
    } else if (skipReplaced) {
      return this.replacedWith(ret);
    } else {
      // replace this, then recurse on children but not this
      return this.replacedWith(ret).withReplacer(replacer, true);
    }
  }
}

export type PluginVisitor<T> = <N extends IR.Node>(
  node: N,
  spine: Spine<N>,
  context: CompilationContext
) => T;

export type Visitor<T> = <N extends IR.Node>(node: N, spine: Spine<N>) => T;

export function programToSpine(node: IR.Program) {
  return new Spine(node, null, null);
}
