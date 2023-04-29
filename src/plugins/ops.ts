import { Plugin, OpTransformOutput } from "../common/Language";
import {
  add1,
  assignment,
  binaryOp,
  BinaryOpCode,
  Expr,
  flipOpCode,
  IndexCall,
  indexCall,
  isBinary,
  isCommutative,
  isIntLiteral,
  isNegative,
  mutatingBinaryOp,
  isPolygolfOp,
  OpCode,
  PolygolfOp,
  polygolfOp,
  unaryOp,
  UnaryOpCode,
  BinaryOpCodes,
  relationOpChain,
  RelationOpCode,
} from "../IR";
import { getType } from "../common/getType";
import { Spine } from "../common/Spine";
import { stringify } from "../common/stringify";

export function mapOps(opMap0: [OpCode, OpTransformOutput][]): Plugin {
  const opMap = new Map<string, OpTransformOutput>(opMap0);
  return {
    name: "mapOps(...)",
    allOrNothing: true,
    visit(node, spine) {
      if (isPolygolfOp(node)) {
        const op = node.op;
        const f = opMap.get(op);
        if (f !== undefined) {
          let replacement = f(node.args, spine as Spine<PolygolfOp>);
          if ("op" in replacement && replacement.kind !== "PolygolfOp") {
            // "as any" because TS doesn't do well with the "in" keyword
            replacement = { ...(replacement as any), op: node.op };
          }
          return { ...replacement, type: getType(node, spine) };
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
export function mapToUnaryAndBinaryOps(
  ...opMap0: [UnaryOpCode | BinaryOpCode, string][]
): Plugin {
  const opMap = new Map(opMap0);
  return {
    ...mapOps(
      opMap0.map(([op, name]) => [
        op,
        isBinary(op)
          ? (x: readonly Expr[]) => asBinaryChain(op, x, opMap)
          : (x: readonly Expr[]) => unaryOp(op, x[0], name),
      ])
    ),
    name: `mapPrecedenceOps(${JSON.stringify(opMap0)})`,
  };
}

function asBinaryChain(
  op: BinaryOpCode,
  exprs: readonly Expr[],
  names: Map<OpCode, string>
): Expr {
  if (op === "mul" && isIntLiteral(exprs[0], -1n)) {
    exprs = [unaryOp("neg", exprs[1], names.get("neg")), ...exprs.slice(2)];
  }
  if (op === "add") {
    exprs = exprs
      .filter((x) => !isNegative(x))
      .concat(exprs.filter(isNegative));
  }
  let result = exprs[0];
  for (const expr of exprs.slice(1)) {
    if (op === "add" && isNegative(expr)) {
      result = binaryOp(
        "sub",
        result,
        polygolfOp("neg", expr),
        names.get("sub")
      );
    } else {
      result = binaryOp(op, result, expr, names.get(op));
    }
  }
  return result;
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
        isPolygolfOp(node, ...ops) &&
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

// "a = a + b" --> "a += b"
export function addMutatingBinaryOp(
  ...opMap0: [BinaryOpCode, string][]
): Plugin {
  const opMap = new Map<BinaryOpCode, string>(opMap0);
  return {
    name: `addMutatingBinaryOp(${JSON.stringify(opMap0)})`,
    visit(node) {
      if (
        node.kind === "Assignment" &&
        isPolygolfOp(node.expr, ...BinaryOpCodes) &&
        node.expr.args.length > 1 &&
        opMap.has(node.expr.op)
      ) {
        const op = node.expr.op;
        const args = node.expr.args;
        const name = opMap.get(op);
        const leftValueStringified = stringify(node.variable);
        const index = node.expr.args.findIndex(
          (x) => stringify(x) === leftValueStringified
        );
        if (index === 0 || (index > 0 && isCommutative(op))) {
          const newArgs = [
            ...args.slice(0, index),
            ...args.slice(index + 1, args.length),
          ];
          return mutatingBinaryOp(
            op,
            node.variable,
            args.length > 1 ? polygolfOp(op, ...newArgs) : newArgs[0],
            name
          );
        }
      }
    },
  };
}

// (a > b) --> (b < a)
export const flipBinaryOps: Plugin = {
  name: "flipBinaryOps",
  visit(node) {
    if (isPolygolfOp(node, ...BinaryOpCodes)) {
      const flippedOpCode = flipOpCode(node.op);
      if (flippedOpCode !== null) {
        return polygolfOp(flippedOpCode, node.args[1], node.args[0]);
      }
    }
  },
};

export const removeImplicitConversions: Plugin = {
  name: "removeImplicitConversions",
  visit(node) {
    if (node.kind === "ImplicitConversion") {
      return node.expr;
    }
  },
};

export function useRelationChains(...ops: RelationOpCode[]): Plugin {
  return {
    name: `useRelationChains(...${JSON.stringify(ops)})`,
    visit(node) {
      if (isPolygolfOp(node, ...ops)) {
        return relationOpChain(node.args, [node.op]);
      }
    },
  };
}

export function relationChainToNestedBinaryOps(
  ...opMap0: [RelationOpCode, string][]
): Plugin {
  const opMap = new Map(opMap0);
  return {
    name: `relationChainToNestedBinaryOps(${JSON.stringify(opMap0)})`,
    visit(node) {
      if (
        node.kind === "RelationOpChain" &&
        node.ops.every((x) => opMap.has(x))
      ) {
        let result = node.args[0];
        node.ops.forEach((op, i) => {
          result = binaryOp(op, result, node.args[i + 1], opMap.get(op));
        });
        return result;
      }
    },
  };
}
