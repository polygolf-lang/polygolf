import { flipOpCode, IR, isBinary, mutatingBinaryOp, polygolfOp } from "../IR";
import { Path, Visitor } from "../common/traverse";
import { GolfPlugin } from "../common/Language";
import { Spine } from "../common/Spine";

// "a = a + b" --> "a += b"
export function addMutatingBinaryOp(...ops: string[]): Visitor {
  return {
    tag: "mutatingVisitor",
    name: `addMutatingBinaryOp(${ops.join(", ")})`,
    enter(path: Path) {
      const node = path.node;
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
}

// (a + b) --> (b + a)
export const flipBinaryOps: GolfPlugin = {
  tag: "golf",
  name: "flipBinaryOps",
  *visit(spine: Spine) {
    const node = spine.node;
    if (node.kind === "PolygolfOp" && isBinary(node.op)) {
      const flippedOpCode = flipOpCode(node.op);
      if (flippedOpCode !== null) {
        const flippedOp = polygolfOp(
          flippedOpCode,
          // temporary "as any" to delay making the whole code base immutable
          node.args[1] as any as IR.Expr,
          node.args[0] as any as IR.Expr
        );
        yield flippedOp;
      }
    }
  },
};
