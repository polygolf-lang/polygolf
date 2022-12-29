import { Plugin, OpTransformOutput } from "../common/Language";
import {
  assignment,
  binaryOp,
  Expr,
  IndexCall,
  indexCall,
  int,
  isBinary,
  isUnary,
  OpCode,
  polygolfOp,
  unaryOp,
} from "../IR";
import { getType } from "../common/getType";

export function mapOps(opMap0: [OpCode, OpTransformOutput][]): Plugin {
  const opMap = new Map<string, OpTransformOutput>(opMap0);
  return {
    name: "mapOps(...)",
    allOrNothing: true,
    visit(node, spine) {
      if (node.kind === "PolygolfOp") {
        const op = node.op;
        const f = opMap.get(op);
        if (f === undefined) {
          return;
        }
        if (typeof f === "string") {
          const type = getType(node, spine.root.node);
          if (isBinary(op))
            return { ...binaryOp(op, node.args[0], node.args[1], f), type };
          else if (isUnary(op))
            return { ...unaryOp(op, node.args[0], f), type };
          else
            throw new Error(
              `Only unary and binary operations can be mapped implicitly, got ${op}`
            );
        } else if (Array.isArray(f)) {
          const type = getType(node, spine.root.node);
          if (isBinary(op)) {
            return {
              ...binaryOp(
                op,
                node.args[0],
                node.args[1],
                f[0],
                f[1],
                f[2] ?? (op === "pow" || op === "text_concat")
              ),
              type,
            };
          } else if (isUnary(op)) {
            return { ...unaryOp(op, node.args[0], f[0], f[1]), type };
          } else
            throw new Error(
              `Only unary and binary operations can be mapped implicitly, got ${op}`
            );
        } else {
          let replacement = f(node.args);
          if ("op" in replacement) {
            // "as any" because TS doesn't do well with the "in" keyword
            replacement = { ...(replacement as any), op: node.op };
          }
          return { ...replacement, type: getType(node, spine.root.node) };
        }
      }
    },
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
        node.args[0].kind === "Identifier"
      ) {
        let indexNode: IndexCall;
        if (oneIndexed && !node.op.startsWith("table_")) {
          indexNode = indexCall(
            node.args[0],
            polygolfOp("add", node.args[1], int(1n)),
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

export function plus1(expr: Expr): Expr {
  return polygolfOp("add", expr, int(1n));
}
