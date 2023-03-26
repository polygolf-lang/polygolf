import { getType } from "../common/getType";
import { Plugin } from "../common/Language";
import { leq, polygolfOp } from "../IR";

export const modToRem: Plugin = {
  name: "modToRem",
  visit(node, spine) {
    if (node.kind === "PolygolfOp" && node.op === "mod") {
      const rightType = getType(node.args[1], spine);
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

export const divToTruncdiv: Plugin = {
  name: "divToTruncdiv",
  visit(node, spine) {
    if (node.kind === "PolygolfOp" && node.op === "div") {
      const rightType = getType(node.args[1], spine);
      if (rightType.kind !== "integer")
        throw new Error(`Unexpected type ${JSON.stringify(rightType)}.`);
      if (leq(0n, rightType.low)) {
        return {
          ...node,
          op: "trunc_div",
        };
      } else {
        return undefined; // TODO
      }
    }
  },
};
