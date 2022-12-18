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
  name: "addMutatingBinaryOp",
  enter(path: Path) {
    const node = path.node;
    if (node.kind === "Assignment" && node.expr.kind === "BinaryOp") {
      if (
        (node.expr.left.kind === "Identifier" &&
          node.variable.kind === "Identifier" &&
          node.variable.name === node.expr.left.name) ||
        (node.expr.left.kind === "IndexCall" &&
          node.expr.left.collection.kind === "Identifier" &&
          node.variable.kind === "IndexCall" &&
          node.variable.collection.kind === "Identifier" &&
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
const flippedOps = new WeakMap();
export const flipBinaryOps: Visitor = {
  name: "flipBinaryOps",
  generatesVariants: true,
  exit(path: Path) {
    const node = path.node;
    if (
      node.kind === "PolygolfOp" &&
      isBinary(node.op) &&
      !flippedOps.has(node)
    ) {
      const flippedOpCode = flipOpCode(node.op);
      if (flippedOpCode !== null) {
        const flippedOp = polygolfOp(flippedOpCode, node.args[1], node.args[0]);
        flippedOps.set(node, true);
        flippedOps.set(flippedOp, true);
        path.replaceWith(variants([node, flippedOp]));
      }
    }
  },
};
