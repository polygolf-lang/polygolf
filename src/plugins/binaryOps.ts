import {
  flipOpCode,
  isBinary,
  mutatingBinaryOp,
  polygolfOp,
  copyType,
} from "../IR";
import { Plugin } from "../common/Language";

// "a = a + b" --> "a += b"
export function addMutatingBinaryOp(...ops: string[]): Plugin {
  return {
    name: `addMutatingBinaryOp(${ops.join(", ")})`,
    visit(node) {
      if (
        node.kind === "Assignment" &&
        node.expr.kind === "BinaryOp" &&
        ops.includes(node.expr.name)
      ) {
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
          return copyType(
            node,
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
}

// (a + b) --> (b + a)
export const flipBinaryOps: Plugin = {
  name: "flipBinaryOps",
  visit(node) {
    if (node.kind === "PolygolfOp" && isBinary(node.op)) {
      const flippedOpCode = flipOpCode(node.op);
      if (flippedOpCode !== null) {
        return copyType(
          node,
          polygolfOp(flippedOpCode, node.args[1], node.args[0])
        );
      }
    }
  },
};
