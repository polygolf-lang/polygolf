import { type Plugin } from "../common/Language";
import { stringify } from "../common/stringify";
import {
  int,
  op,
  type IntegerType,
  isConstantType,
  type Op,
  isSubtype,
  isOp,
  isInt,
  implicitConversion,
  integerType,
  type Node,
  sub1,
  add1,
} from "../IR";
import { getType } from "../common/getType";
import { mapOps } from "./ops";
import { type Spine } from "@/common/Spine";
import { filterInplace } from "../common/arrays";

export function modToRem(node: Node, spine: Spine) {
  if (isOp("mod")(node)) {
    return isSubtype(getType(node.args[1], spine), integerType(0))
      ? op("rem", ...node.args)
      : op(
          "rem",
          op("add", op("rem", ...node.args), node.args[1]),
          node.args[1],
        );
  }
}

export function divToTruncdiv(node: Node, spine: Spine) {
  if (isOp("div")(node)) {
    return isSubtype(getType(node.args[1], spine), integerType(0))
      ? op("trunc_div", ...node.args)
      : undefined; // TODO
  }
}

export const truncatingOpsPlugins = [modToRem, divToTruncdiv];

export function equalityToInequality(node: Node, spine: Spine) {
  if (isOp("eq[Int]", "neq[Int]")(node)) {
    const eq = node.op === "eq[Int]";
    const [a, b] = [node.args[0], node.args[1]];
    const [t1, t2] = [a, b].map((x) => getType(x, spine)) as [
      IntegerType,
      IntegerType,
    ];
    if (isConstantType(t1)) {
      if (t1.low === t2.low) {
        // (0 == $x:0..9) -> (1 > $x:0..9)
        // (0 != $x:0..9) -> (0 < $x:0..9)
        return eq ? op("gt", int(t1.low + 1n), b) : op("lt", int(t1.low), b);
      }
      if (t1.low === t2.high) {
        // (9 == $x:0..9) -> (8 < $x:0..9)
        // (9 != $x:0..9) -> (9 > $x:0..9)
        return eq ? op("lt", int(t1.low - 1n), b) : op("gt", int(t1.low), b);
      }
    }

    if (isConstantType(t2)) {
      if (t1.low === t2.low) {
        // ($x:0..9 == 0) -> ($x:0..9 < 1)
        // ($x:0..9 != 0) -> ($x:0..9 > 0)
        return eq ? op("lt", a, int(t2.low + 1n)) : op("gt", a, int(t2.low));
      }
      if (t1.high === t2.low) {
        // ($x:0..9 == 9) -> ($x:0..9 > 8)
        // ($x:0..9 != 9) -> ($x:0..9 < 9)
        return eq ? op("gt", a, int(t2.low - 1n)) : op("lt", a, int(t2.low));
      }
    }
  }
}

export const removeBitnot: Plugin = mapOps({
  bit_not: (x) => op("sub", int(-1), x[0]),
});

export function addBitnot(node: Node) {
  if (isOp("add")(node) && node.args.length === 2 && isInt()(node.args[0])) {
    if (node.args[0].value === 1n)
      return op("neg", op("bit_not", node.args[1]));
    if (node.args[0].value === -1n)
      return op("bit_not", op("neg", node.args[1]));
  }
}

export const bitnotPlugins = [removeBitnot, addBitnot];

type BinaryBoolOp = "and" | "or" | "unsafe_and" | "unsafe_or";
function complementaryBoolOp(op: BinaryBoolOp): BinaryBoolOp {
  switch (op) {
    case "and":
      return "or";
    case "or":
      return "and";
    case "unsafe_and":
      return "unsafe_or";
    case "unsafe_or":
      return "unsafe_and";
  }
}

export function applyDeMorgans(node: Node, spine: Spine) {
  if (isOp("and", "or", "unsafe_and", "unsafe_or")(node)) {
    if (
      isOp("unsafe_and", "unsafe_or")(node) &&
      getType(node, spine).kind === "void"
    ) {
      // If we are promised we won't read the result, we don't need to negate.
      return op(
        complementaryBoolOp(node.op),
        op("not", node.args[0]),
        node.args[1],
      );
    }
    return op(
      "not",
      op(complementaryBoolOp(node.op), ...node.args.map((x) => op("not", x))),
    );
  }
  if (isOp("bit_and", "bit_or")(node)) {
    return op(
      "bit_not",
      op(
        node.op === "bit_and" ? "bit_or" : "bit_and",
        ...node.args.map((x) => op("bit_not", x)),
      ),
    );
  }
}

export function useIntegerTruthiness(node: Node, spine: Spine) {
  if (
    isOp("eq[Int]", "neq[Int]")(node) &&
    !spine.isRoot &&
    spine.parent!.node.kind === "If" &&
    spine.pathFragment === "condition"
  ) {
    const res = isInt(0n)(node.args[1])
      ? implicitConversion("int_to_bool", node.args[0])
      : isInt(0n)(node.args[0])
      ? implicitConversion("int_to_bool", node.args[1])
      : undefined;
    return res !== undefined && node.op === "eq[Int]" ? op("not", res) : res;
  }
}

function isConstantTypePowerOfTwo(n: Node, s: Spine) {
  const type = getType(n, s);
  if (type.kind === "integer" && isConstantType(type)) {
    const v = type.low;
    return v !== 0n && (v & (v - 1n)) === 0n;
  }
  return false;
}

function isPowerOfTwo(n: Node, s: Spine): boolean {
  return (
    isConstantTypePowerOfTwo(n, s) ||
    (isOp("pow", "bit_shift_left")(n) && isPowerOfTwo(n.args[0], s))
  );
}

export function modToBitand(node: Node, spine: Spine) {
  if (isOp("mod")(node)) {
    const n = node.args[1];
    if (isPowerOfTwo(n, spine)) {
      return op("bit_and", node.args[0], sub1(n));
    }
  }
}

export function bitandToMod(node: Node, spine: Spine) {
  if (isOp("bit_and")(node)) {
    for (const i of [0, 1]) {
      const n = add1(node.args[i]);
      if (isPowerOfTwo(n, spine)) {
        return op("mod", node.args[1 - i], n);
      }
    }
  }
}

export const lowBitsPlugins = [modToBitand, bitandToMod];

export function powToMul(limit: number = 2): Plugin {
  return {
    name: `powToMul(${limit})`,
    visit(node) {
      if (isOp("pow")(node)) {
        const [a, b] = node.args;
        if (isInt()(b) && 1 < b.value && b.value <= limit) {
          return op("mul", ...Array(Number(b.value)).fill(a));
        }
      }
    },
  };
}

export function mulToPow(node: Node, spine: Spine) {
  if (isOp("mul")(node)) {
    const factors = new Map<string, [Node, number]>();
    for (const e of node.args) {
      const stringified = stringify(e);
      factors.set(stringified, [
        e,
        1 + ((factors.get(stringified)?.at(1) as number) ?? 0),
      ]);
    }
    const pairs = [...factors.values()];
    if (pairs.some((pair) => pair[1] > 1)) {
      return op(
        "mul",
        ...pairs.map(([expr, exp]) =>
          exp > 1 ? op("pow", expr, int(exp)) : expr,
        ),
      );
    }
  }
}

export const powPlugins = [powToMul(), mulToPow];

export function bitShiftToMulOrDiv(
  literalOnly = true,
  toMul = true,
  toDiv = true,
): Plugin {
  return {
    name: `bitShiftToMulOrDiv(${[literalOnly, toMul, toDiv]
      .map((x) => (x ? "true" : "false"))
      .toString()})`,
    visit(node) {
      if (isOp("bit_shift_left", "bit_shift_right")(node)) {
        const [a, b] = node.args;
        if (!literalOnly || isInt()(b)) {
          if (node.op === "bit_shift_left" && toMul) {
            return op("mul", a, op("pow", int(2), b));
          }
          if (node.op === "bit_shift_right" && toDiv) {
            return op("div", a, op("pow", int(2), b));
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
      if (isOp("div")(node) && fromDiv) {
        const [a, b] = node.args;
        if (isInt()(b)) {
          const [n, exp] = getOddAnd2Exp(b.value);
          if (exp > 1 && n === 1n) {
            return op("bit_shift_right", a, int(exp));
          }
        }
        if (isOp("pow")(b) && isInt(2n)(b.args[0])) {
          return op("bit_shift_right", a, b.args[1]);
        }
      }
      if (isOp("mul")(node) && fromMul) {
        if (isInt()(node.args[0])) {
          const [n, exp] = getOddAnd2Exp(node.args[0].value);
          if (exp > 1) {
            return op(
              "bit_shift_left",
              op("mul", int(n), ...node.args.slice(1)),
              int(exp),
            );
          }
        }
        const powNode = node.args.find(
          (x) => isOp("pow")(x) && isInt(2n)(x.args[0]),
        ) as Op | undefined;
        if (powNode !== undefined) {
          return op(
            "bit_shift_left",
            op("mul", ...node.args.filter((x) => x !== powNode)),
            powNode.args[1],
          );
        }
      }
    },
  };
}

export const bitShiftPlugins = [bitShiftToMulOrDiv(), mulOrDivToBitShift()];

export type IntDecomposition = [
  // [k,b,e,d,cost] represents a value k * pow(b,e) + d, cost = lg(k)+lg(b)+lg(e)+lg(d)
  bigint,
  bigint,
  bigint,
  bigint,
  number,
];

// assert (1000 ≤ |n|)
export function decomposeInt(
  n: bigint,
  hasScientific = false,
  hasPowers = true,
  hasShifts = true,
): IntDecomposition[] {
  return decomposeAnyInt(n, n, hasScientific, hasPowers, hasShifts);
}

// assert (1000 ≤ x ≤ y || x ≤ y ≤ -1000)
export function decomposeAnyInt(
  x: bigint,
  y: bigint,
  hasScientific = false,
  hasPowers = true,
  hasShifts = true,
): IntDecomposition[] {
  return x > 0
    ? _decomposeAnyInt(x, y, hasScientific, hasPowers, hasShifts)
    : _decomposeAnyInt(-y, -x, hasScientific, hasPowers, hasShifts).map(
        ([k, b, e, d, c]) => [-k, b, e, -d, c],
      );
}

function lg(n: bigint): number {
  if (n < 0) n = -n;
  return n > 1000000000000
    ? 2 + n.toString(16).length
    : n > 99
    ? n.toString().length
    : n > 9
    ? 2
    : 1;
}

function ceilDiv(a: bigint, b: bigint) {
  return (a + (b - 1n)) / b;
}

// assert (1000 ≤ x ≤ y)
// Find decompositions x ≤ k * b^e + d ≤ y s.t. 1000 ≤ b^e, 2 ≤ b ≤ 10, |d| < 100
function _decomposeAnyInt(
  x: bigint,
  y: bigint,
  hasScientific = false,
  hasPowers = true,
  hasShifts = true,
): IntDecomposition[] {
  function betterOrEqual(
    [k1, b1, e1, d1, c1]: IntDecomposition,
    [k2, b2, e2, d2, c2]: IntDecomposition,
  ): boolean {
    return (
      (!hasShifts || b1 === 2n || b2 !== 2n) &&
      (!hasScientific || b1 === 10n || b2 !== 10n) &&
      (k1 === 1n || k2 !== 1n) &&
      (d1 === 0n || d2 !== 0n) &&
      c1 <= c2
    );
  }
  const xd = x - 99n;
  const yd = y + 99n;
  const decompositions: IntDecomposition[] = [];
  for (let b = 2n; b <= 10n; b += hasPowers ? 1n : 8n) {
    if (
      !hasPowers &&
      ((!hasShifts && b === 2n) || (!hasScientific && b === 10n))
    )
      continue;
    for (
      let e = 2n, be = b * b, kx = ceilDiv(xd, be), ky = yd / be;
      kx <= ky;
      e++, be *= b, kx = ceilDiv(kx, b), ky /= b
    ) {
      if (be < 1000) continue;
      const kmax = ky > kx ? kx + 1n : kx;
      for (let k = kx; k <= kmax; k++) {
        if (k % b === 0n && lg(e) === lg(e + 1n)) continue;
        const m = k * be;
        const d = m > y ? y - m : m < x ? x - m : 0n;
        const newDecomposition: IntDecomposition = [
          k,
          b,
          e,
          d,
          lg(k) + lg(b) + lg(e) + lg(d),
        ];
        if (
          decompositions.some((decomposition) =>
            betterOrEqual(decomposition, newDecomposition),
          )
        )
          continue;
        filterInplace(
          decompositions,
          (decomposition) => !betterOrEqual(newDecomposition, decomposition),
        );
        decompositions.push(newDecomposition);
      }
    }
  }
  return decompositions;
}

export function decomposeIntLiteral(
  hasScientific = false,
  hasPowers = true,
  hasShifts = true,
): Plugin {
  return {
    name: `decomposeIntLiteral(${JSON.stringify([
      hasScientific,
      hasPowers,
      hasShifts,
    ])})`,
    visit(node) {
      let decompositions: IntDecomposition[] = [];
      if (isInt()(node) && (node.value <= -1000 || node.value >= 1000)) {
        decompositions = decomposeInt(
          node.value,
          hasScientific,
          hasPowers,
          hasShifts,
        );
      } else if (node.kind === "AnyInteger") {
        decompositions = decomposeAnyInt(
          node.low,
          node.high,
          hasScientific,
          hasPowers,
          hasShifts,
        );
      }

      return decompositions.map(([k, b, e, d]) =>
        op("add", op("mul", int(k), op("pow", int(b), int(e))), int(d)),
      );
    },
  };
}

export function pickAnyInt(node: Node) {
  if (node.kind === "AnyInteger") {
    return node.low.toString().length < node.high.toString().length
      ? int(node.low)
      : int(node.high);
  }
}

export function useImplicitBoolToInt(node: Node, spine: Spine) {
  if (
    isOp("bool_to_int")(node) &&
    !spine.isRoot &&
    isOp("at[Array]", "at[List]")(spine.parent!.node) // This can be extend to other ops, like "mul".
  ) {
    return implicitConversion(node.op, node.args[0]);
  }
}
