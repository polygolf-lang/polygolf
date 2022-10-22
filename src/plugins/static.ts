import {
  assignment,
  BinaryOpCodeArray,
  block,
  getArgs,
  int,
  IntegerLiteral,
  OpCode,
  polygolfOp,
  StringLiteral,
  stringLiteral,
  variants,
} from "../IR";
import { Path, Visitor } from "../common/traverse";

const golfedNodes = new WeakMap();
export const golfStringListLiteral: Visitor = {
  generatesVariants: true,
  exit(path: Path) {
    const node = path.node;
    if (
      !golfedNodes.has(node) &&
      node.type === "Assignment" &&
      node.expr.type === "ListConstructor" &&
      node.expr.exprs.every((x) => x.type === "StringLiteral")
    ) {
      golfedNodes.set(node, true);
      const strings = (node.expr.exprs as StringLiteral[]).map((x) => x.value);
      const delim = getDelim(strings);
      path.replaceWith(
        variants([
          block([
            assignment(
              structuredClone(node.variable),
              polygolfOp(
                "str_split",
                stringLiteral(strings.join(delim)),
                stringLiteral(delim)
              )
            ),
          ]),
          block([node]),
        ])
      );
    }
  },
};

function getDelim(strings: string[]): string {
  for (let i = 32; i < 127; i++) {
    const c = String.fromCharCode(i);
    if (strings.every((x) => !x.includes(c))) {
      return c;
    }
  }
  let i = 0;
  while (strings.some((x) => x.includes(String(i)))) {
    i++;
  }
  return String(i);
}

export const evalStaticIntegers: Visitor = {
  exit(path: Path) {
    const node = path.node;
    if (
      "op" in node &&
      node.op !== null &&
      BinaryOpCodeArray.includes(node.op) &&
      node.type !== "MutatingBinaryOp"
    ) {
      const args = getArgs(node);
      if (args.every((x) => x.type === "IntegerLiteral")) {
        try {
          path.replaceWith(
            int(
              evalOp(
                node.op,
                args.map((x) => (x as IntegerLiteral).value)
              )
            )
          );
        } catch {}
      }
    }
  },
};

function evalOp(op: OpCode, values: bigint[]): bigint {
  const a = values[0];
  switch (op) {
    case "neg":
      return -a;
    case "bitnot":
      return -1n - a;
  }
  const b = values[1];
  switch (op) {
    case "add":
      return a + b;
    case "sub":
      return a - b;
    case "mul":
      return a * b;
    case "div":
      return floorDiv(a, b);
    case "truncdiv":
      return a / b;
    case "mod":
      return a - b * floorDiv(a, b);
    case "rem":
      return a - b * (a / b);
  }
  throw new Error(`Unsupported op ${op}.`);
}

function floorDiv(a: bigint, b: bigint): bigint {
  const res = a / b;
  return a < 0 !== b < 0 ? res - 1n : res;
}
