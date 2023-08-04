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
  functionCall,
  propertyCall,
} from "../IR";
import { getType } from "../common/getType";
import { Spine } from "../common/Spine";
import { stringify } from "../common/stringify";

export function mapOps(...opMap0: [OpCode, OpTransformOutput][]): Plugin {
  const opMap = toOpMap(opMap0);
  return {
    name: "mapOps(...)",
    allOrNothing: true,
    visit(node, spine) {
      if (isPolygolfOp(node)) {
        const op = node.op;
        const f = opMap.get(op);
        if (f !== undefined) {
          let replacement =
            typeof f === "function"
              ? f(node.args, spine as Spine<PolygolfOp>)
              : f;
          if (replacement === undefined) return undefined;
          if ("op" in replacement && replacement.kind !== "PolygolfOp") {
            // "as any" because TS doesn't do well with the "in" keyword
            replacement = {
              ...(replacement as any),
              op: node.op,
            } as const as Expr;
          }
          return { ...replacement, type: getType(node, spine) };
        }
      }
    },
  };
}

function toOpMap<Op extends OpCode, T>(opMap0: [Op, T][]) {
  const res = new Map(opMap0);
  for (const [a, b] of [
    ["unsafe_and", "and"],
    ["unsafe_or", "or"],
  ] as any) {
    if (!res.has(a) && res.has(b)) {
      res.set(a, res.get(b)!);
    }
  }
  return res;
}

/**
 * Plugin transforming binary and unary ops to the name and precedence in the target lang.
 * @param opMap0 OpCode - target op name pairs.
 * @returns The plugin closure.
 */
export function mapToUnaryAndBinaryOps(
  ...opMap0: [UnaryOpCode | BinaryOpCode, string][]
): Plugin {
  const opMap = toOpMap(opMap0);
  return {
    ...mapOps(
      ...opMap0.map(
        ([op, name]) =>
          [
            op,
            isBinary(op)
              ? (x: readonly Expr[]) => asBinaryChain(op, x, opMap)
              : (x: readonly Expr[]) => unaryOp(name, x[0]),
          ] satisfies [OpCode, OpTransformOutput]
      )
    ),
    name: `mapToUnaryAndBinaryOps(${JSON.stringify(opMap0)})`,
  };
}

function asBinaryChain(
  op: BinaryOpCode,
  exprs: readonly Expr[],
  names: Map<OpCode, string>
): Expr {
  const negName = names.get("neg");
  if (op === "mul" && isIntLiteral(exprs[0], -1n) && negName !== undefined) {
    exprs = [unaryOp(negName, exprs[1]), ...exprs.slice(2)];
  }
  if (op === "add") {
    exprs = exprs
      .filter((x) => !isNegative(x))
      .concat(exprs.filter(isNegative));
  }
  let result = exprs[0];
  for (const expr of exprs.slice(1)) {
    const subName = names.get("sub");
    if (op === "add" && isNegative(expr) && subName !== undefined) {
      result = binaryOp(subName, result, polygolfOp("neg", expr));
    } else {
      result = binaryOp(names.get(op) ?? "?", result, expr);
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
          indexNode = indexCall(node.args[0], add1(node.args[1]), true);
        } else {
          indexNode = indexCall(node.args[0], node.args[1]);
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
  const opMap = toOpMap(opMap0);
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
        const name = opMap.get(op)!;
        const leftValueStringified = stringify(node.variable);
        const index = node.expr.args.findIndex(
          (x) => stringify(x) === leftValueStringified
        );
        if (index === 0 || (index > 0 && isCommutative(op))) {
          const newArgs = args.filter((x, i) => i !== index);
          if (op === "add" && opMap.has("sub") && newArgs.every(isNegative)) {
            return mutatingBinaryOp(
              opMap.get("sub")!,
              node.variable,
              polygolfOp("neg", polygolfOp(op, ...newArgs))
            );
          }
          return mutatingBinaryOp(
            name,
            node.variable,
            newArgs.length > 1 ? polygolfOp(op, ...newArgs) : newArgs[0]
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

export const methodsAsFunctions: Plugin = {
  name: "methodsAsFunctions",
  visit(node) {
    if (node.kind === "MethodCall") {
      return functionCall(propertyCall(node.object, node.ident), node.args);
    }
  },
};

export const printIntToPrint: Plugin = {
  ...mapOps(
    ["print_int", (x) => polygolfOp("print", polygolfOp("int_to_text", ...x))],
    [
      "println_int",
      (x) => polygolfOp("println", polygolfOp("int_to_text", ...x)),
    ]
  ),
  name: "printIntToPrint",
};
