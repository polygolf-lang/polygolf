import { getType } from "../common/getType";
import { Path, Visitor } from "../common/traverse";
import { binaryOp } from "../IR";

export const modToRem: Visitor = {
  exit(path: Path) {
    const node = path.node;
    const program = path.root.node;
    if (node.type === "BinaryOp" && node.op === "mod") {
      const rightType = getType(node.right, program);
      if (rightType.type !== "integer")
        throw new Error(`Unexpected type ${JSON.stringify(rightType)}.`);
      if (rightType.low !== undefined && rightType.low >= 0n) {
        node.op = "rem";
      } else {
        path.replaceWith(
          binaryOp(
            "rem",
            binaryOp("add", binaryOp("rem", node.left, node.right), node.right),
            node.right
          )
        );
      }
    }
  },
};

export const divToTruncdiv: Visitor = {
  exit(path: Path) {
    const node = path.node;
    const program = path.root.node;
    if (node.type === "BinaryOp" && node.op === "div") {
      const rightType = getType(node.right, program);
      if (rightType.type !== "integer")
        throw new Error(`Unexpected type ${JSON.stringify(rightType)}.`);
      if (rightType.low !== undefined && rightType.low >= 0n) {
        node.op = "truncdiv";
      } else {
        throw new Error("Not implemented.");
      }
    }
  },
};
