import { Path } from "../common/traverse";
import { OpTransformOutput } from "../common/Language";
import { binaryOp, BinaryOpCodeArray, unaryOp, UnaryOpCodeArray } from "../IR";
import { getType } from "../common/getType";

export function mapOps(opMap0: [string, OpTransformOutput][]) {
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
          if (BinaryOpCodeArray.includes(op))
            path.replaceWith(binaryOp(op, node.args[0], node.args[1], f));
          else if (UnaryOpCodeArray.includes(op))
            path.replaceWith(unaryOp(op, node.args[0], f));
          else
            throw new Error(
              `Only unary and binary operations can be mapped implicitly, got ${op}`
            );
        } else if (Array.isArray(f)) {
          if (BinaryOpCodeArray.includes(op))
            path.replaceWith(
              binaryOp(
                op,
                node.args[0],
                node.args[1],
                f[0],
                f[1],
                f[2] ?? (op === "exp" || op === "str_concat")
              )
            );
          else if (UnaryOpCodeArray.includes(op))
            path.replaceWith(unaryOp(op, node.args[0], f[0], f[1]));
          else
            throw new Error(
              `Only unary and binary operations can be mapped implicitly, got ${op}`
            );
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
