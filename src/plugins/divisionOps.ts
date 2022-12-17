import { getType } from "../common/getType";
import { Path, Visitor } from "../common/traverse";
import { leq, polygolfOp } from "../IR";

export const modToRem: Visitor = {
  name: "modToRem",
  exit(path: Path) {
    const node = path.node;
    const program = path.root.node;
    if (node.kind === "PolygolfOp" && node.op === "mod") {
      const rightType = getType(node.args[1], program);
      if (rightType.kind !== "integer")
        throw new Error(`Unexpected type ${JSON.stringify(rightType)}.`);
      if (leq(0n, rightType.low)) {
        node.op = "rem";
      } else {
        path.replaceWith(
          polygolfOp(
            "rem",
            polygolfOp("add", polygolfOp("rem", ...node.args), node.args[1]),
            node.args[1]
          )
        );
      }
    }
  },
};

export const divToTruncdiv: Visitor = {
  name: "divToTruncdiv",
  exit(path: Path) {
    const node = path.node;
    const program = path.root.node;
    if (node.kind === "PolygolfOp" && node.op === "div") {
      const rightType = getType(node.args[1], program);
      if (rightType.kind !== "integer")
        throw new Error(`Unexpected type ${JSON.stringify(rightType)}.`);
      if (rightType.low !== undefined && rightType.low >= 0n) {
        node.op = "trunc_div";
      } else {
        throw new Error("Not implemented.");
      }
    }
  },
};
