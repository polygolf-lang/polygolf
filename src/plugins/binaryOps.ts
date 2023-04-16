import {
  BinaryOpCode,
  BinaryOpCodes,
  flipOpCode,
  isCommutative,
  isPolygolfOp,
  mutatingBinaryOp,
  polygolfOp,
} from "../IR";
import { Plugin } from "../common/Language";
import { stringify } from "../common/stringify";

// "a = a + b" --> "a += b"
export function addMutatingBinaryOp(
  ...opMap0: [BinaryOpCode, string][]
): Plugin {
  const opMap = new Map<BinaryOpCode, string>(opMap0);
  return {
    name: `addMutatingBinaryOp(${JSON.stringify(opMap0)})`,
    visit(node) {
      if (
        node.kind === "Assignment" &&
        isPolygolfOp(node.expr, ...BinaryOpCodes) &&
        node.expr.args.length > 1 &&
        opMap.has(node.expr.op)
      ) {
        const op = node.expr.op;
        const args = node.expr.args;
        const name = opMap.get(op);
        const leftValueStringified = stringify(node.variable);
        const index = node.expr.args.findIndex(
          (x) => stringify(x) === leftValueStringified
        );
        if (index === 0 || (index > 0 && isCommutative(op))) {
          const newArgs = [
            ...args.slice(0, index),
            ...args.slice(index + 1, args.length),
          ];
          return mutatingBinaryOp(
            op,
            node.variable,
            args.length > 1 ? polygolfOp(op, ...newArgs) : newArgs[0],
            name
          );
        }
      }
    },
  };
}

// (a > b) --> (b < a)
export const flipBinaryOps: Plugin = {
  name: "flipBinaryOps",
  visit(node) {
    if (isPolygolfOp(node, ...BinaryOpCodes)) {
      const flippedOpCode = flipOpCode(node.op);
      if (flippedOpCode !== null) {
        return polygolfOp(flippedOpCode, node.args[1], node.args[0]);
      }
    }
  },
};
