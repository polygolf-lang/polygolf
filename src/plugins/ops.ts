import { Path } from "../common/traverse";
import { OpTransformOutput } from "../common/Language";
import { Expr } from "../IR";
import { getType } from "../common/getType";

export function mapOps(opMap0: [string, OpTransformOutput][]) {
  const opMap = new Map<string, OpTransformOutput>(opMap0);
  return {
    enter(path: Path) {
      const node = path.node;
      if (node.type === "BinaryOp" || node.type === "UnaryOp") {
        const f = opMap.get(node.op);
        if (f === undefined) {
          throw new Error(`Unsupported operator ${node.op}!`);
        }
        if (typeof f === "string") {
          node.name = f;
        } else if (Array.isArray(f)) {
          node.name = f[0];
          node.precedence = f[1];
          if (node.type === "BinaryOp")
            node.rightAssociative =
              f[2] ?? (node.op === "exp" || node.op === "str_concat");
        } else {
          let replacement: Expr;
          if (node.type === "BinaryOp") {
            replacement = f(node.left, node.right);
          } else {
            replacement = f(node.arg, node.arg);
          }
          if ("op" in replacement) replacement.op = node.op;
          replacement.valueType = getType(node, path.root.node);
          path.replaceWith(replacement);
        }
      } else if (node.type === "MutatingBinaryOp") {
        const f = opMap.get(node.op);
        if (f === undefined) {
          throw new Error(`Unsupported operator ${node.op}!`);
        }
        if (typeof f === "string") {
          node.name = f;
        } else if (Array.isArray(f)) {
          node.name = f[0];
        }
      }
    },
  };
}
