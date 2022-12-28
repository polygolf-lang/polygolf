import { Path, Visitor } from "../common/traverse";
import { block, Expr, manyToManyAssignment } from "../IR";

export const tempVarToMultipleAssignment: Visitor = {
  tag: "mutatingVisitor",
  name: "tempVarToMultipleAssignment",
  exit(path: Path) {
    const node = path.node;
    if (node.kind === "Block") {
      const newNodes: Expr[] = [];
      let changed = false;
      for (let i = 0; i < node.children.length; i++) {
        const a = node.children[i];
        if (i >= node.children.length - 2) {
          newNodes.push(a);
          continue;
        }
        const b = node.children[i + 1];
        const c = node.children[i + 2];
        if (
          a.kind === "Assignment" &&
          b.kind === "Assignment" &&
          c.kind === "Assignment" &&
          b.expr.kind === "Identifier" &&
          c.variable.kind === "Identifier" &&
          b.expr.name === c.variable.name &&
          c.expr.kind === "Identifier" &&
          a.variable.kind === "Identifier" &&
          c.expr.name === a.variable.name
        ) {
          newNodes.push(
            manyToManyAssignment([b.variable, c.variable], [b.expr, a.expr])
          );
          changed = true;
          i += 2;
        } else {
          newNodes.push(a);
        }
      }
      if (changed) path.replaceWith(block(newNodes));
    }
  },
};
