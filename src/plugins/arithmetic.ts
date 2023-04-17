import { Plugin } from "../common/Language";
import { int, leq, isIntLiteral, polygolfOp } from "../IR";
import { mapOps } from "./ops";
import { getType } from "../common/getType";

export const modToRem: Plugin = {
  name: "modToRem",
  visit(node, spine) {
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

export const divToTruncdiv: Plugin = {
  name: "divToTruncdiv",
  visit(node, spine) {
    const program = spine.root.node;
    if (node.kind === "PolygolfOp" && node.op === "div") {
      const rightType = getType(node.args[1], program);
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

export const truncatingOpsPlugins = [modToRem, divToTruncdiv];

export const removeBitnot: Plugin = {
  ...mapOps([["bit_not", (x) => polygolfOp("sub", int(-1), x[0])]]),
  name: "removeBitnot",
};

export const addBitnot: Plugin = {
  name: "addBitnot",
  visit(node) {
    if (
      node.kind === "PolygolfOp" &&
      node.op === "add" &&
      node.args.length === 2 &&
      isIntLiteral(node.args[0])
    ) {
      if (node.args[0].value === 1n)
        return polygolfOp("neg", polygolfOp("bit_not", node.args[1]));
      if (node.args[0].value === -1n)
        return polygolfOp("bit_not", polygolfOp("neg", node.args[1]));
    }
  },
};

export const bitnotPlugins = [removeBitnot, addBitnot];
