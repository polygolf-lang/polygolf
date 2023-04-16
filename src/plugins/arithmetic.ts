import { Plugin } from "../common/Language";
import { int, isIntLiteral, polygolfOp } from "../IR";
import { mapOps } from "./ops";

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
