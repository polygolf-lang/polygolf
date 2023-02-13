import { stringify } from "../common/applyLanguage";
import { getType } from "../common/getType";
import { Plugin } from "../common/Language";
import { leq, polygolfOp } from "../IR";

export const modToRem: Plugin = {
  name: "modToRem",
  visit(node, spine) {
    const program = spine.root.node;
    if (node.kind === "PolygolfOp" && node.op === "mod") {
      const rightType = getType(node.args[1], program);
      if (rightType.kind !== "integer")
        throw new Error(`Unexpected type ${stringify(rightType)}.`);
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

export const divToTruncdiv: Plugin = {
  name: "divToTruncdiv",
  visit(node, spine) {
    const program = spine.root.node;
    if (node.kind === "PolygolfOp" && node.op === "div") {
      const rightType = getType(node.args[1], program);
      if (rightType.kind !== "integer")
        throw new Error(`Unexpected type ${stringify(rightType)}.`);
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
