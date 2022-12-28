import { IR } from "../IR";
import { getChild, getChildFragments, PathFragment } from "./fragments";
import { Immutable, replaceAtIndex } from "./immutable";

type imNode = Immutable<IR.Node>;

/** A Spine is like a Path but immutable. It assumes
 * that no mutation is performed on itself or its members. */
export class Spine<N extends imNode = imNode> {
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

  getChildSpines(): Spine[] {
    return Array.from(getChildFragments(this.node)).map((n) =>
      this.getChild(n)
    );
  }

  getChild(pathFragment: PathFragment): Spine {
    return new Spine(getChild(this.node, pathFragment), this, pathFragment);
  }

  withChildReplaced(newChild: imNode, pathFragment: PathFragment): Spine {
    const node = (typeof pathFragment === "string"
      ? { ...this.node, [pathFragment]: newChild }
      : {
          ...this.node,
          [pathFragment.prop]: replaceAtIndex(
            (this.node as any)[pathFragment.prop],
            pathFragment.index,
            newChild
          ),
        }) as any as imNode;
    return new Spine(
      node,
      this.parent === null || this.pathFragment === null
        ? null
        : this.parent.withChildReplaced(node, this.pathFragment),
      this.pathFragment
    );
  }

  replacedWith(newNode: imNode): Spine {
    if (this.parent === null || this.pathFragment === null)
      throw new Error("Cannot replace the root node");
    return this.parent.withChildReplaced(newNode, this.pathFragment);
  }

  replacedWithRoot(newNode: imNode) {
    return this.replacedWith(newNode).root.node;
  }

  *visit<T>(
    visitor: (spine: Spine) => Iterable<T>
  ): Generator<T, void, undefined> {
    yield* visitor(this);
    for (const child of this.getChildSpines()) yield* child.visit(visitor);
  }
}

export function programToSpine(node: Immutable<IR.Program>) {
  return new Spine(node, null, null);
}
