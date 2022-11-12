import {
  flipOpCode,
  isBinary,
  mutatingBinaryOp,
  polygolfOp,
  variants,
} from "../IR";
import { Path, Visitor } from "../common/traverse";

// "a = a + b" --> "a += b"
export const addMutatingBinaryOp: Visitor = {
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
          mutatingBinaryOp(
            node.expr.op,
            node.variable,
            node.expr.right,
            node.expr.name
          )
        );
      }
    }
  },
};

// "a + b; --> {a + b; b + a}"
export const flipBinaryOps: Visitor = {
  generatesVariants: true,
  exit(path: Path) {
    const node = path.node;
    if (node.type === "PolygolfOp" && isBinary(node.op)) {
      const flipped = flipOpCode(node.op);
      if (flipped !== null) {
        path.replaceWith(
          variants([node, polygolfOp(flipped, node.args[1], node.args[0])])
        );
      }
    }
  },
};
