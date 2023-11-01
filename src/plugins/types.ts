import { PolygolfError } from "../common/errors";
import { getType } from "../common/getType";
import { type Plugin } from "../common/Language";
import {
  int64Type,
  type IntegerType,
  integerType,
  isOp,
  isSubtype,
  type OpCode,
  type,
  type Type,
} from "../IR";

export const assertInt64: Plugin = {
  name: "assertInt64",
  visit(node, spine) {
    if (spine.isRoot) return;
    let type: Type;
    try {
      type = getType(node, spine);
    } catch {
      return; // stuff like builtin identifiers etc. throw
    }
    if (isSubtype(type, integerType()) && !isSubtype(type, int64Type)) {
      throw new PolygolfError(
        `Integer value that doesn't provably fit into a int64 type encountered.`,
        node.source,
      );
    }
    return undefined;
  },
};

export function floodBigints(
  primitiveIntType0: "int64" | "int53" | IntegerType,
  allowed: Partial<Record<OpCode, "bigint" | "int">>,
): Plugin {
  const primitiveIntType = type(primitiveIntType0) as IntegerType;
  return {
    name: "floodBigints",
    visit(node, spine) {
      let nodeType: Type;
      try {
        nodeType = getType(node, spine);
      } catch {
        return;
      }
      if (
        isSubtype(nodeType, integerType()) &&
        !isSubtype(nodeType, primitiveIntType) &&
        node.targetType !== "bigint"
      ) {
        return { ...node, targetType: "bigint" };
      }
      if (!spine.isRoot) {
        const parent = spine.parent!.node;
        if (isOp()(parent) && parent.targetType === "bigint") {
          const res = (allowed as any)[parent.op];
          if (res === undefined) {
            throw new PolygolfError(
              "Operation that is not supported on bigints encountered.",
            );
          }
          if (res === "bigint" && node.targetType !== "bigint") {
            return { ...node, targetType: "bigint" };
          }
        }
      }
    },
  };
}
