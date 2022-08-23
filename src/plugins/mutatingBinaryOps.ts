import { assignment, binaryOp, mutatingBinaryOp } from "../IR";
import { Path } from "../common/traverse";

// "a += b" --> "a = a + b"
export const removeMutatingBinaryOp = {
  enter(path: Path) {
    const node = path.node;
    if (node.type === "MutatingBinaryOp") {
      path.replaceWith(
        assignment(node.variable, binaryOp(node.op, node.variable, node.right))
      );
    }
  },
};

// "a = a + b" --> "a += b"
export const addMutatingBinaryOp = {
  enter(path: Path) {
    const node = path.node;
    if (node.type === "Assignment" && node.expr.type === "BinaryOp") {
      if (
        node.expr.left.type === "Identifier" &&
        node.variable.name === node.expr.left.name
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
