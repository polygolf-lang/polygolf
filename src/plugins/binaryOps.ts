import { flipOpCode, isBinary, mutatingBinaryOp, polygolfOp } from "../IR";
import { GolfPlugin } from "../common/Language";
import { Spine } from "../common/Spine";

// "a = a + b" --> "a += b"
export function addMutatingBinaryOp(...ops: string[]): GolfPlugin {
  return {
    tag: "golf",
    name: `addMutatingBinaryOp(${ops.join(", ")})`,
    visit(spine: Spine) {
      const node = spine.node;
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
export const flipBinaryOps: GolfPlugin = {
  tag: "golf",
  name: "flipBinaryOps",
  visit(spine: Spine) {
    const node = spine.node;
    if (node.kind === "PolygolfOp" && isBinary(node.op)) {
      const flippedOpCode = flipOpCode(node.op);
      if (flippedOpCode !== null) {
        return polygolfOp(flippedOpCode, node.args[1], node.args[0]);
      }
    }
  },
};
