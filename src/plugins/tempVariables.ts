import { Path, Visitor } from "../common/traverse";
import { block, manyToManyAssignment, Statement } from "../IR";

export const tempVarToMultipleAssignment: Visitor = {
  exit(path: Path) {
    const node = path.node;
    if (node.type === "Block") {
      const newNodes: Statement[] = [];
      for (let i = 0; i < node.children.length; i++) {
        const a = node.children[i];
        if (i >= node.children.length - 2) {
          newNodes.push(a);
          continue;
        }
        const b = node.children[i + 1];
        const c = node.children[i + 2];
        if (
          a.type === "Assignment" &&
          b.type === "Assignment" &&
          c.type === "Assignment" &&
          b.expr.type === "Identifier" &&
          c.variable.type === "Identifier" &&
          b.expr.name === c.variable.name &&
          c.expr.type === "Identifier" &&
          a.variable.type === "Identifier" &&
          c.expr.name === a.variable.name
        ) {
          newNodes.push(
            manyToManyAssignment([b.variable, c.variable], [b.expr, a.expr])
          );
          i += 2;
        } else {
          newNodes.push(a);
        }
      }
      path.replaceWith(block(newNodes));
    }
  },
};
