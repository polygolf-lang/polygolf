import { flipOpCode, isBinary, mutatingBinaryOp, polygolfOp } from "../IR";
import { Plugin } from "../common/Language";
import { stringify } from "../common/stringify";

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
            stringify(node.variable.index) === stringify(node.expr.left.index))
        ) {
          return mutatingBinaryOp(
            node.expr.op,
            node.variable,
            node.expr.right,
            node.expr.name
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
        return polygolfOp(flippedOpCode, node.args[1], node.args[0]);
      }
    }
  },
};
