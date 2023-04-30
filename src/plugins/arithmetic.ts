import { Plugin } from "../common/Language";
import { stringify } from "../common/stringify";
import {
  int,
  leq,
  polygolfOp,
  IntegerType,
  isConstantType,
  isIntLiteral,
  Expr,
  PolygolfOp,
} from "../IR";
import { getType } from "../common/getType";

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

export const truncatingOpsPlugins = [modToRem, divToTruncdiv];

export const equalityToInequality: Plugin = {
  name: "equalityToInequality",
  visit(node, spine) {
    if (node.kind === "PolygolfOp" && (node.op === "eq" || node.op === "neq")) {
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

export function powToMul(limit: number = 2): Plugin {
  return {
    name: `powToMul(${limit})`,
    visit(node) {
      if (node.kind === "PolygolfOp" && node.op === "pow") {
        const [a, b] = node.args;
        if (isIntLiteral(b) && b.value > 1 && b.value <= limit) {
          return polygolfOp("mul", ...Array(Number(b.value)).fill(a));
        }
      }
    },
  };
}

export const mulToPow: Plugin = {
  name: "mulToPow",
  visit(node) {
    if (node.kind === "PolygolfOp" && node.op === "mul") {
      const factors = new Map<string, [Expr, number]>();
      for (const e of node.args) {
        const stringified = stringify(e);
        factors.set(stringified, [
          e,
          1 + ((factors.get(stringified)?.at(1) as number) ?? 0),
        ]);
      }
      const pairs = [...factors.values()];
      if (pairs.some((pair) => pair[1] > 1)) {
        return polygolfOp(
          "mul",
          ...pairs.map(([expr, exp]) =>
            exp > 1 ? polygolfOp("pow", expr, int(exp)) : expr
          )
        );
      }
    }
  },
};

export const powPlugins = [powToMul(), mulToPow];

export function bitShiftToMulOrDiv(
  literalOnly = true,
  toMul = true,
  toDiv = true
): Plugin {
  return {
    name: `bitShiftToMulOrDiv(${[literalOnly, toMul, toDiv]
      .map((x) => (x ? "true" : "false"))
      .toString()})`,
    visit(node) {
      if (
        node.kind === "PolygolfOp" &&
        ["bit_shift_left", "bit_shift_right"].includes(node.op)
      ) {
        const [a, b] = node.args;
        if (!literalOnly || isIntLiteral(b)) {
          if (node.op === "bit_shift_left" && toMul) {
            return polygolfOp("mul", a, polygolfOp("pow", int(2), b));
          }
          if (node.op === "bit_shift_right" && toMul) {
            return polygolfOp("div", a, polygolfOp("pow", int(2), b));
          }
        }
      }
    },
  };
}

function getOddAnd2Exp(n: bigint): [bigint, bigint] {
  let exp = 0n;
  while ((n & 1n) === 0n) {
    n >>= 1n;
    exp++;
  }
  return [n, exp];
}

export function mulOrDivToBitShift(fromMul = true, fromDiv = true): Plugin {
  return {
    name: `mulOrDivToBitShift(${[fromMul, fromDiv]
      .map((x) => (x ? "true" : "false"))
      .toString()})`,
    visit(node) {
      if (node.kind === "PolygolfOp" && node.op === "div" && fromDiv) {
        const [a, b] = node.args;
        if (isIntLiteral(b)) {
          const [n, exp] = getOddAnd2Exp(b.value);
          if (exp > 1 && n === 1n) {
            return polygolfOp("bit_shift_right", a, int(exp));
          }
        }
        if (
          b.kind === "PolygolfOp" &&
          b.op === "pow" &&
          isIntLiteral(b.args[0], 2n)
        ) {
          return polygolfOp("bit_shift_right", a, b.args[1]);
        }
      }
      if (node.kind === "PolygolfOp" && node.op === "mul" && fromMul) {
        if (isIntLiteral(node.args[0])) {
          const [n, exp] = getOddAnd2Exp(node.args[0].value);
          if (exp > 1) {
            return polygolfOp(
              "bit_shift_left",
              polygolfOp("mul", int(n), ...node.args.slice(1)),
              int(exp)
            );
          }
        }
        const powNode = node.args.find(
          (x) =>
            x.kind === "PolygolfOp" &&
            x.op === "pow" &&
            isIntLiteral(x.args[0], 2n)
        ) as PolygolfOp | undefined;
        if (powNode !== undefined) {
          return polygolfOp(
            "bit_shift_left",
            polygolfOp("mul", ...node.args.filter((x) => x !== powNode)),
            powNode.args[1]
          );
        }
      }
    },
  };
}

export const bitShiftPlugins = [bitShiftToMulOrDiv(), mulOrDivToBitShift()];
