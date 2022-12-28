import { getType } from "../common/getType";
import { GolfPlugin } from "../common/Language";
import { Spine } from "../common/Spine";
import { leq, polygolfOp } from "../IR";

export const modToRem: GolfPlugin = {
  tag: "golf",
  name: "modToRem",
  visit(spine: Spine) {
    const node = spine.node;
    const program = spine.root.node;
    if (node.kind === "PolygolfOp" && node.op === "mod") {
      const rightType = getType(node.args[1], program);
      if (rightType.kind !== "integer")
        throw new Error(`Unexpected type ${JSON.stringify(rightType)}.`);
      if (leq(0n, rightType.low)) {
        return polygolfOp("rem", ...node.args);
      } else {
        return polygolfOp(
          "rem",
          polygolfOp("add", polygolfOp("rem", ...node.args), node.args[1]),
          node.args[1]
        );
      }
    }
  },
};

export const divToTruncdiv: GolfPlugin = {
  tag: "golf",
  name: "divToTruncdiv",
  visit(spine: Spine) {
    const node = spine.node;
    const program = spine.root.node;
    if (node.kind === "PolygolfOp" && node.op === "div") {
      const rightType = getType(node.args[1], program);
      if (rightType.kind !== "integer")
        throw new Error(`Unexpected type ${JSON.stringify(rightType)}.`);
      if (rightType.low !== undefined && rightType.low >= 0n) {
        return {
          ...node,
          op: "trunc_div",
        };
      } else {
        throw new Error("Not implemented.");
      }
    }
  },
};
