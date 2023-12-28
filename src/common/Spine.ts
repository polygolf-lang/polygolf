import { block, type IR, isOp, op, isOfKind, type Node } from "../IR";
import type { VisitorContext, CompilationContext } from "./compile";
import { getChild, getChildFragments, type PathFragment } from "./fragments";
import { replaceAtIndex } from "./arrays";
import { readsFromInput } from "./symbols";

/** A Spine points to one node and keeps track of all of its ancestors up to
 * the root program node. The main purpose of a Spine is for traversal. */
export class Spine<N extends IR.Node = IR.Node> {
  public readonly root: Spine<IR.Node>;

  constructor(
    public readonly node: N,
    public readonly parent: Spine | null,
    public readonly pathFragment: PathFragment | null,
  ) {
    this.root = parent?.root ?? parent ?? this;
  }

  get depth(): number {
    return this.parent === null ? 0 : 1 + this.parent.depth;
  }

  get isRoot() {
    return this.parent === null;
  }

  /** Get a list of all child spines. */
  getChildSpines(): Spine[] {
    return Array.from(getChildFragments(this.node)).map((n) =>
      this.getChild(n),
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
              newChild,
            ),
          };
    return new Spine(
      node,
      this.parent === null || this.pathFragment === null
        ? null
        : this.parent.withChildReplaced(node, this.pathFragment),
      this.pathFragment,
    );
  }

  /** Return the spine (pointing to this node) determined from replacing this
   * node with `newNode`. Replaces all of the ancestors of this node, up to the
   * root program, to get a fresh spine up to the program node.
   * If `canonizeAndReturnRoot`, all `Op`s up to the root are canonized
   * and the root spine is returned. */
  replacedWith(newNode: IR.Node, canonizeAndReturnRoot = false): Spine {
    if (this.parent === null || this.pathFragment === null) {
      return new Spine(newNode, null, null);
    }
    const parentNode = this.parent.node;
    const parent =
      canonizeAndReturnRoot &&
      isOfKind("Op", "Block")(parentNode) &&
      typeof this.pathFragment === "object"
        ? this.parent.replacedWith(
            {
              ...(isOp()(parentNode)
                ? op.unsafe(
                    parentNode.op,
                    ...replaceAtIndex(
                      parentNode.args,
                      this.pathFragment.index,
                      newNode,
                    ),
                  )
                : block(
                    replaceAtIndex(
                      parentNode.children,
                      this.pathFragment.index,
                      newNode,
                    ),
                  )),
              targetType: parentNode.targetType,
            },
            true,
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
    let skipChildren = false;
    const ret = func(this.node, this, {
      skipChildren() {
        skipChildren ||= true;
      },
      skipReplacement() {},
    });
    if (ret !== undefined) yield ret;
    if (!skipChildren)
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

  /** Returns all descendants meeting the provided condition. */
  filterNodes(cond: Visitor<boolean>) {
    return this.compactMap((n, s, skip) => (cond(n, s, skip) ? n : undefined));
  }

  /** Counts the descendants meeting the provided condition. */
  countNodes(cond: Visitor<boolean>) {
    return [...this.filterNodes(cond)].length;
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
    skipReplaced = false,
    skipThis = false,
  ): Spine {
    let skipReplacement = skipReplaced;
    let skipChildren = false;
    const ret = skipThis
      ? undefined
      : replacer(this.node, this, {
          skipChildren() {
            skipChildren ||= true;
          },
          skipReplacement() {
            skipReplacement ||= true;
          },
        });
    if (ret === undefined && skipChildren) return this;
    else if (ret === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      let curr = this as Spine;
      // recurse on children
      if (isOfKind("Op", "Block")(this.node)) {
        // Create canonical Op / block instead of just replacing the chidren
        const newChildren: IR.Node[] = [];
        let someChildrenIsNew = false;
        for (const child of this.getChildSpines()) {
          const newChild = child.withReplacer(replacer, skipReplaced, false);
          newChildren.push(newChild.node);
          someChildrenIsNew ||= newChild !== child;
        }
        if (someChildrenIsNew)
          curr = curr.replacedWith({
            ...(isOp()(this.node)
              ? op.unsafe(this.node.op, ...newChildren)
              : block(newChildren)),
            targetType: this.node.targetType,
          });
      } else {
        for (const child of this.getChildSpines()) {
          const newChild = child.withReplacer(replacer, skipReplaced, false);
          if (newChild !== child) {
            curr = curr.withChildReplaced(newChild.node, child.pathFragment!);
            // Following line should be equivalent but doesn't work: (Bug?)
            //    curr = child.replacedWith(newChild.node).parent!;
          }
        }
      }
      return curr;
    } else if (skipReplacement || skipChildren) {
      return this.replacedWith(ret);
    } else {
      // replace this, then recurse on children but not this
      return this.replacedWith(ret).withReplacer(replacer, skipReplaced, true);
    }
  }
}

export type PluginVisitor<T = IR.Node[] | IR.Node | undefined> = (
  node: Node,
  spine: Spine,
  context: CompilationContext,
) => T;

export type Visitor<T> = (
  node: Node,
  spine: Spine,
  context: VisitorContext,
) => T;

export function programToSpine(node: IR.Node) {
  return new Spine(node, null, null);
}

export function isInputless(program: IR.Node) {
  return !programToSpine(program).someNode(readsFromInput);
}
