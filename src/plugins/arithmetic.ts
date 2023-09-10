import { Plugin } from "../common/Language";
import { stringify } from "../common/stringify";
import {
  int,
  polygolfOp,
  IntegerType,
  isConstantType,
  Expr,
  PolygolfOp,
  isSubtype,
  isPolygolfOp,
  isIntLiteral,
  implicitConversion,
  integerType,
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
          if (node.op === "bit_shift_right" && toDiv) {
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

export type IntDecomposition = [
  // [k,b,e,d] represents a value k * pow(b,e) + d
  bigint,
  bigint,
  bigint,
  bigint
];

type AnyIntDecomposition = [
  // [m,k,b,e] represents an equation m = k * pow(b,e)
  bigint,
  bigint,
  bigint,
  bigint
];

// assert (abs(n) >= 10000)
export function decomposeInt(n: bigint): IntDecomposition[] {
  // return decomposeAnyInt(n, n);

  const result =
    n > 0
      ? _decomposeAnyInt(n - 99n, n + 99n)
      : _decomposeAnyInt(-n - 99n, -n + 99n).map(([m, k, b, e]) => [
          -m,
          -k,
          b,
          e,
        ]);

  return result.map(([m, k, b, e]) => [k, b, e, n - m]);
}

// assert (10000 <= x <= y || x <= y <= -10000)
export function decomposeAnyInt(x: bigint, y: bigint): IntDecomposition[] {
  const result =
    x > 0
      ? _decomposeAnyInt(x - 99n, y + 99n)
      : _decomposeAnyInt(-y - 99n, -x + 99n).map(([m, k, b, e]) => [
          -m,
          -k,
          b,
          e,
        ]);

  return result.map(([m, k, b, e]) => [
    k,
    b,
    e,
    m > y ? m - y : m < x ? m - x : 0n,
  ]);
}

// Find all decompositions m = k * b^e s.t. k < 100, b < 100 for all m s.t. x <= m <= y
function _decomposeAnyInt(x: bigint, y: bigint): AnyIntDecomposition[] {
  // Inference: 9900 < x <= y
  const result: AnyIntDecomposition[] = [];
  for (let b = 2n; b < 100; b++) {
    let be = b * b; // b^e
    for (let e = 2n; be <= y; e++, be *= b) {
      // x / be <= k <= y / be
      let kx = (x - 1n) / be + 1n; // round up
      if (kx >= 100) continue;
      let ky = y / be;
      if (ky > 99) ky = 99n;
      for (; kx <= ky; kx++)
        if (kx % b !== 0n) result.push([kx * be, kx, b, e]);
    }
  }
  return result;
}

export const decomposeIntLiteral: Plugin = {
  name: "decomposeIntLiteral",
  visit(node) {
    let decompositions: IntDecomposition[] = [];
    if (isIntLiteral(node) && (node.value <= -10000 || node.value >= 10000)) {
      decompositions = decomposeInt(node.value);
    } else if (node.kind === "AnyIntegerLiteral") {
      decompositions = decomposeAnyInt(node.low, node.high);
    }
    // TODO: consider  more than 1 decomposition once plugins can suggest multiple replacements (#221)
    if (decompositions.length > 0) {
      const [k, b, e, d] = decompositions[0];
      return polygolfOp(
        "add",
        polygolfOp("mul", int(k), polygolfOp("pow", int(b), int(e))),
        int(d)
      );
    }
  },
};

export const pickAnyInt: Plugin = {
  name: "pickAnyInt",
  visit(node) {
    if (node.kind === "AnyIntegerLiteral") {
      return node.low.toString().length < node.high.toString().length
        ? int(node.low)
        : int(node.high);
    }
  },
};
