import { Path, Visitor } from "../common/traverse";
import { OpTransformOutput } from "../common/Language";
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

export function mapOps(opMap0: [string, OpTransformOutput][]): Visitor {
  const opMap = new Map<string, OpTransformOutput>(opMap0);
  return {
    enter(path: Path) {
      const node = path.node;
      if (node.type === "PolygolfOp") {
        const op = node.op;
        const f = opMap.get(op);
        if (f === undefined) {
          return;
        }
        if (typeof f === "string") {
          let replacement: Expr;
          if (isBinary(op))
            replacement = binaryOp(op, node.args[0], node.args[1], f);
          else if (isUnary(op)) replacement = unaryOp(op, node.args[0], f);
          else
            throw new Error(
              `Only unary and binary operations can be mapped implicitly, got ${op}`
            );
          replacement.valueType = node.valueType;
          path.replaceWith(replacement);
        } else if (Array.isArray(f)) {
          let replacement: Expr;
          if (isBinary(op)) {
            replacement = binaryOp(
              op,
              node.args[0],
              node.args[1],
              f[0],
              f[1],
              f[2] ?? (op === "pow" || op === "text_concat")
            );
          } else if (isUnary(op)) {
            replacement = unaryOp(op, node.args[0], f[0], f[1]);
          } else
            throw new Error(
              `Only unary and binary operations can be mapped implicitly, got ${op}`
            );
          replacement.valueType = node.valueType;
          path.replaceWith(replacement);
        } else {
          const replacement = f(node.args);
          if ("op" in replacement) replacement.op = node.op;
          replacement.valueType = getType(node, path.root.node);
          path.replaceWith(replacement);
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
): Visitor {
  return {
    enter(path: Path) {
      const node = path.node;
      if (
        node.type === "PolygolfOp" &&
        (ops.length === 0 || ops.includes(node.op)) &&
        node.args[0].type === "Identifier"
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
          path.replaceWith(indexNode);
        } else if (node.op.endsWith("_set")) {
          path.replaceWith(assignment(indexNode, node.args[2]));
        }
      }
    },
  };
}

export function plus1(expr: Expr): Expr {
  return polygolfOp("add", expr, int(1n));
}
