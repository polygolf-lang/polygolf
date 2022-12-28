import { GolfPlugin, OpTransformOutput } from "../common/Language";
import {
  assignment,
  binaryOp,
  Expr,
  IndexCall,
  indexCall,
  int,
  IR,
  isBinary,
  isUnary,
  OpCode,
  polygolfOp,
  unaryOp,
} from "../IR";
import { getType } from "../common/getType";
import { Spine } from "../common/Spine";

export function mapOps(opMap0: [OpCode, OpTransformOutput][]): GolfPlugin {
  const opMap = new Map<string, OpTransformOutput>(opMap0);
  return {
    tag: "golf",
    name: "mapOps(...)",
    allOrNothing: true,
    visit(spine: Spine) {
      // temporary "as any" to delay making the whole code base immutable;
      const node = spine.node as any as IR.Node;
      if (node.kind === "PolygolfOp") {
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
          replacement.type = node.type;
          return replacement;
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
          replacement.type = node.type;
          return replacement;
        } else {
          const replacement = f(node.args);
          if ("op" in replacement) replacement.op = node.op;
          replacement.type = getType(node, spine.root.node);
          return replacement;
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
): GolfPlugin {
  return {
    tag: "golf",
    name: `useIndexCalls(${JSON.stringify(oneIndexed)}, ${JSON.stringify(
      ops
    )})`,
    allOrNothing: true,
    visit(spine: Spine) {
      // temporary "as any" to delay making the whole code base immutable;
      const node = spine.node as any as IR.Node;
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
