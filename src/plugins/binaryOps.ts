import {
  binaryOp,
  BinaryOp,
  BinaryOpCode,
  Expr,
  flipOpCode,
  isBinary,
  mutatingBinaryOp,
  polygolfOp,
} from "../IR";
import { Plugin } from "../common/Language";
import { stringify } from "../common/applyLanguage";

// "a = a + b" --> "a += b"
export function addMutatingBinaryOp(
  ops: string[],
  associative: BinaryOpCode[] = [
    "add",
    "mul",
    "bit_and",
    "bit_xor",
    "gcd",
    "min",
    "max",
    "text_concat",
  ]
): Plugin {
  return {
    name: `addMutatingBinaryOp([${ops.join(", ")}],[${associative.join(
      ", "
    )}])`,
    visit(node) {
      if (
        node.kind === "Assignment" &&
        node.expr.kind === "BinaryOp" &&
        ops.includes(node.expr.name)
      ) {
        const root = node.expr;
        const left = node.variable;
        const [first, ...rest] = getAssociativeChainArgs(root, associative);
        if (
          (left.kind === "Identifier" &&
            first.kind === "Identifier" &&
            left.name === first.name) ||
          (first.kind === "IndexCall" &&
            first.collection.kind === "Identifier" &&
            left.kind === "IndexCall" &&
            left.collection.kind === "Identifier" &&
            left.collection.name === first.collection.name &&
            stringify(left.index) === stringify(first.index))
        ) {
          return mutatingBinaryOp(
            node.expr.op,
            node.variable,
            rest.reduce((a, b) =>
              binaryOp(
                root.op,
                a,
                b,
                root.name,
                root.precedence,
                root.associativity
              )
            ),
            node.expr.name
          );
        }
      }
    },
  };
}

function getAssociativeChainArgs(
  root: BinaryOp,
  associative: BinaryOpCode[]
): Expr[] {
  const result: Expr[] = [];
  const isAssociative = associative.includes(root.op);
  function traverse(node: Expr, isRoot = false) {
    if (
      node.kind === "BinaryOp" &&
      node.op === root.op &&
      node.precedence === root.precedence &&
      (isRoot || isAssociative)
    ) {
      traverse(node.left);
      traverse(node.right);
    } else {
      result.push(node);
    }
  }
  traverse(root, true);
  return result;
}

// (a + b) --> (b + a)
export const flipBinaryOps: Plugin = {
  name: "flipBinaryOps",
  visit(node) {
    if (node.kind === "PolygolfOp" && isBinary(node.op)) {
      const flippedOpCode = flipOpCode(node.op);
      if (flippedOpCode !== null) {
        return polygolfOp(flippedOpCode, node.args[1], node.args[0]);
      }
    }
  },
};
