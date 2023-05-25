import { Plugin } from "../common/Language";
import {
  int,
  polygolfOp,
  IntegerType,
  isConstantType,
  isSubtype,
  integerType,
  isPolygolfOp,
  isIntLiteral,
  implicitConversion,
} from "../IR";
import { getType } from "../common/getType";
import { mapOps } from "./ops";

export const modToRem: Plugin = {
  name: "modToRem",
  visit(node, spine) {
    if (isPolygolfOp(node, "mod")) {
      return isSubtype(getType(node.args[1], spine), integerType(0))
        ? polygolfOp("rem", ...node.args)
        : polygolfOp(
            "rem",
            polygolfOp("add", polygolfOp("rem", ...node.args), node.args[1]),
            node.args[1]
          );
    }
  },
};

export const divToTruncdiv: Plugin = {
  name: "divToTruncdiv",
  visit(node, spine) {
    if (isPolygolfOp(node, "div")) {
      return isSubtype(getType(node.args[1], spine), integerType(0))
        ? polygolfOp("trunc_div", ...node.args)
        : undefined; // TODO
    }
  },
};

export const truncatingOpsPlugins = [modToRem, divToTruncdiv];

export const equalityToInequality: Plugin = {
  name: "equalityToInequality",
  visit(node, spine) {
    if (isPolygolfOp(node, "eq", "neq")) {
      const eq = node.op === "eq";
      const [a, b] = [node.args[0], node.args[1]];
      const [t1, t2] = [a, b].map((x) => getType(x, spine)) as [
        IntegerType,
        IntegerType
      ];
      if (isConstantType(t1)) {
        if (t1.low === t2.low) {
          // (0 == $x:0..9) -> (1 > $x:0..9)
          // (0 != $x:0..9) -> (0 < $x:0..9)
          return eq
            ? polygolfOp("gt", int(t1.low + 1n), b)
            : polygolfOp("lt", int(t1.low), b);
        }
        if (t1.low === t2.high) {
          // (9 == $x:0..9) -> (8 < $x:0..9)
          // (9 != $x:0..9) -> (9 > $x:0..9)
          return eq
            ? polygolfOp("lt", int(t1.low - 1n), b)
            : polygolfOp("gt", int(t1.low), b);
        }
      }

      if (isConstantType(t2)) {
        if (t1.low === t2.low) {
          // ($x:0..9 == 0) -> ($x:0..9 < 1)
          // ($x:0..9 != 0) -> ($x:0..9 > 0)
          return eq
            ? polygolfOp("lt", a, int(t2.low + 1n))
            : polygolfOp("gt", a, int(t2.low));
        }
        if (t1.high === t2.low) {
          // ($x:0..9 == 9) -> ($x:0..9 > 8)
          // ($x:0..9 != 9) -> ($x:0..9 < 9)
          return eq
            ? polygolfOp("gt", a, int(t2.low - 1n))
            : polygolfOp("lt", a, int(t2.low));
        }
      }
    }
  },
};

export const removeBitnot: Plugin = {
  ...mapOps(["bit_not", (x) => polygolfOp("sub", int(-1), x[0])]),
  name: "removeBitnot",
};

export const addBitnot: Plugin = {
  name: "addBitnot",
  visit(node) {
    if (
      isPolygolfOp(node, "add") &&
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

export const applyDeMorgans: Plugin = {
  name: "applyDeMorgans",
  visit(node, spine) {
    if (isPolygolfOp(node, "and", "or", "unsafe_and", "unsafe_or")) {
      const negation = polygolfOp(
        node.op === "and"
          ? "or"
          : node.op === "or"
          ? "and"
          : node.op === "unsafe_and"
          ? "unsafe_or"
          : "unsafe_and",
        ...node.args.map((x) => polygolfOp("not", x))
      );
      if (getType(node, spine).kind === "void") return negation; // If we are promised we won't read the result, we don't need to negate.
      return polygolfOp("not", negation);
    }
    if (isPolygolfOp(node, "bit_and", "bit_or")) {
      return polygolfOp(
        "bit_not",
        polygolfOp(
          node.op === "bit_and" ? "bit_or" : "bit_and",
          ...node.args.map((x) => polygolfOp("bit_not", x))
        )
      );
    }
  },
};

export const useIntegerTruthiness: Plugin = {
  name: "useIntegerTruthiness",
  visit(node, spine) {
    if (
      isPolygolfOp(node, "eq", "neq") &&
      spine.parent!.node.kind === "IfStatement" &&
      spine.pathFragment === "condition"
    ) {
      const res = isIntLiteral(node.args[1], 0n)
        ? implicitConversion("int_to_bool", node.args[0])
        : isIntLiteral(node.args[0], 0n)
        ? implicitConversion("int_to_bool", node.args[1])
        : undefined;
      return res !== undefined && node.op === "eq"
        ? polygolfOp("not", res)
        : res;
    }
  },
};
