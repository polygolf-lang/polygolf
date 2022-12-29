import { getType } from "../common/getType";
import { Plugin } from "../common/Language";
import { Spine } from "../common/Spine";
import { copyType, leq, polygolfOp } from "../IR";

export const modToRem: Plugin = {
  name: "modToRem",
  visit(spine: Spine) {
    const node = spine.node;
    const program = spine.root.node;
    if (node.kind === "PolygolfOp" && node.op === "mod") {
      const rightType = getType(node.args[1], program);
      if (rightType.kind !== "integer")
        throw new Error(`Unexpected type ${JSON.stringify(rightType)}.`);
      if (leq(0n, rightType.low)) {
        return copyType(node, polygolfOp("rem", ...node.args));
      } else {
        return copyType(
          node,
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

export const divToTruncdiv: Plugin = {
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
