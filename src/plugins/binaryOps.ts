import { mutatingBinaryOp } from "../IR";
import { Path } from "../common/traverse";

// "a = a + b" --> "a += b"
export const addMutatingBinaryOp = {
  enter(path: Path) {
    const node = path.node;
    if (node.type === "Assignment" && node.expr.type === "BinaryOp") {
      if (
        (node.expr.left.type === "Identifier" &&
          node.variable.type === "Identifier" &&
          node.variable.name === node.expr.left.name) ||
        (node.expr.left.type === "IndexCall" &&
          node.expr.left.collection.type === "Identifier" &&
          node.variable.type === "IndexCall" &&
          node.variable.collection.type === "Identifier" &&
          node.variable.collection.name === node.expr.left.collection.name &&
          JSON.stringify(node.variable.index) ===
            JSON.stringify(node.expr.left.index))
      ) {
        path.replaceWith(
          mutatingBinaryOp(node.expr.op, node.variable, node.expr.right)
        );
      }
      // "a = b + a" --> "a += b"
      /* This requires to keep information about the semantics of a operator
    else if (node.expr.right.type === "Identifier" 
    && node.variable.name === node.expr.right.name
    && is_symmetric(node.expr.op)) {
      path.replaceWith(
        mutatingBinaryOp(
          node.expr.op,
          node.variable,
          node.expr.left
        )
      );
    }
    */
    }
  },
};
