import { Plugin, OpTransformOutput } from "../common/Language";
import {
  assignment,
  Associativity,
  binaryOp,
  BinaryOpCode,
  Expr,
  IndexCall,
  indexCall,
  int,
  IntegerType,
  isBinary,
  isConstantType,
  OpCode,
  PolygolfOp,
  polygolfOp,
  unaryOp,
  UnaryOpCode,
} from "../IR";
import { getType } from "../common/getType";
import { Spine } from "@/common/Spine";

export function mapOps(opMap0: [OpCode, OpTransformOutput][]): Plugin {
  const opMap = new Map<string, OpTransformOutput>(opMap0);
  return {
    name: "mapOps(...)",
    allOrNothing: true,
    visit(node, spine) {
      if (node.kind === "PolygolfOp") {
        const op = node.op;
        const f = opMap.get(op);
        if (f !== undefined) {
          let replacement = f(node.args, spine as Spine<PolygolfOp>);
          if ("op" in replacement && replacement.kind !== "PolygolfOp") {
            // "as any" because TS doesn't do well with the "in" keyword
            replacement = { ...(replacement as any), op: node.op };
          }
          return { ...replacement, type: getType(node, spine.root.node) };
        }
      }
    },
  };
}

/**
 * Plugin transforming binary and unary ops to the name and precedence in the target lang.
 * @param opMap0 Each group defines operators of the same precedence, higher precedence ones first.
 * @returns The plugin closure.
 */
export function mapPrecedenceOps(
  ...opMap0: [UnaryOpCode | BinaryOpCode, string, Associativity?][][]
): Plugin {
  function opTransform(
    recipe: [UnaryOpCode | BinaryOpCode, string, Associativity?],
    precedence: number
  ): [OpCode, OpTransformOutput] {
    const [op, name, associativity] = recipe;
    return [
      op,
      isBinary(op)
        ? (x: readonly Expr[]) =>
            binaryOp(op, x[0], x[1], name, precedence, associativity)
        : (x: readonly Expr[]) => unaryOp(op, x[0], name, precedence),
    ];
  }
  const opMap = opMap0.flatMap((x, i) =>
    x.map((recipe) => opTransform(recipe, opMap0.length - i))
  );
  return {
    ...mapOps(opMap),
    name: `mapPrecedenceOps(${JSON.stringify(opMap0)})`,
  };
}

export function useIndexCalls(
  oneIndexed: boolean = false,
  ops: OpCode[] = [
    "array_get",
    "list_get",
    "table_get",
    "array_set",
    "list_set",
    "table_set",
  ]
): Plugin {
  return {
    name: `useIndexCalls(${JSON.stringify(oneIndexed)}, ${JSON.stringify(
      ops
    )})`,
    allOrNothing: true,
    visit(node) {
      if (
        node.kind === "PolygolfOp" &&
        (ops.length === 0 || ops.includes(node.op)) &&
        (node.args[0].kind === "Identifier" || node.op.endsWith("_get"))
      ) {
        let indexNode: IndexCall;
        if (oneIndexed && !node.op.startsWith("table_")) {
          indexNode = indexCall(
            node.args[0],
            add1(node.args[1]),
            node.op,
            true
          );
        } else {
          indexNode = indexCall(node.args[0], node.args[1], node.op);
        }
        if (node.op.endsWith("_get")) {
          return indexNode;
        } else if (node.op.endsWith("_set")) {
          return assignment(indexNode, node.args[2]);
        }
      }
    },
  };
}

export function add(expr: Expr, amount: bigint = 1n): Expr {
  if (amount === 0n) return expr;

  if (expr.kind === "IntegerLiteral") return int(expr.value + amount);

  if (expr.kind === "PolygolfOp" && ["add", "sub"].includes(expr.op)) {
    const a = expr.args[0];
    const b = expr.args[1];

    if (a.kind === "IntegerLiteral") {
      if (a.value + amount === 0n && expr.op === "add") return b;
      return polygolfOp(expr.op, add(a, amount), b);
    }
    if (b.kind === "IntegerLiteral") {
      if (amount + (expr.op === "add" ? b.value : -b.value) === 0n) return a;
      return polygolfOp(
        expr.op,
        a,
        add(b, expr.op === "add" ? amount : -amount)
      );
    }
  }

  return amount > 0n
    ? polygolfOp("add", expr, int(amount))
    : polygolfOp("sub", expr, int(-amount));
}

export const add1 = (expr: Expr) => add(expr, 1n);
export const sub1 = (expr: Expr) => add(expr, -1n);

export const equalityToInequality: Plugin = {
  name: "equalityToInequality",
  visit(node, spine) {
    if (node.kind === "PolygolfOp" && (node.op === "eq" || node.op === "neq")) {
      const eq = node.op === "eq";
      const [a, b] = [node.args[0], node.args[1]];
      const [t1, t2] = [a, b].map((x) => getType(x, spine.root.node)) as [
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
