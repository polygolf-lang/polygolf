import type { CompilationContext } from "../common/compile";
import type { Spine } from "../common/Spine";
import type { Node } from "../IR";

export function ssaInline(n: Node, s: Spine, c: CompilationContext) {
  c.skipChildren();
}

type IdentAllocationConstraint = "originalName" | "targetType";
export function allocateIdents(...constraints: IdentAllocationConstraint[]) {
  return function allocateIdents(n: Node, s: Spine, c: CompilationContext) {
    c.skipChildren();
  };
}
