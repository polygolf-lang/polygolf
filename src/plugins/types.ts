import type { Spine } from "../common/Spine";
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
  type Assignment,
  isAssignment,
  type Node,
  type Identifier,
  isUserIdent,
  annotate,
} from "../IR";

export function assertInt64(node: Node, spine: Spine) {
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
}

export function floodBigints(
  primitiveIntType0: "int64" | "int53" | IntegerType,
  allowed: Partial<Record<OpCode | Assignment["kind"], "bigint" | "int">>,
): Plugin {
  const primitiveIntType = type(primitiveIntType0) as IntegerType;
  return {
    name: "floodBigints",
    visit(node, spine) {
      const nodeType = getType(
        isAssignment(node) ? node.variable : node,
        spine,
      );
      if (
        isSubtype(nodeType, integerType()) &&
        !isSubtype(nodeType, primitiveIntType) &&
        node.targetType !== "bigint"
      ) {
        return { ...node, targetType: "bigint" };
      }
      if (!spine.isRoot) {
        const parent = spine.parent!.node;
        if (isOp()(parent) || isAssignment(parent)) {
          if (parent.targetType === "bigint" || node.targetType === "bigint") {
            const res = (allowed as any)[
              isOp()(parent) ? parent.op : "Assignment"
            ];
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
      }
    },
  };
}

export function mapVarsThatNeedBigint(
  primitiveIntType0: "int64" | "int53" | IntegerType,
  f: (x: Identifier) => Node,
): Plugin {
  const primitiveIntType = type(primitiveIntType0) as IntegerType;
  return {
    name: "mapVarsThatNeedBigint(...)",
    visit(node, spine) {
      if (isUserIdent()(node) && node.targetType === "bigint") {
        const type = getType(node, spine);
        if (isSubtype(type, primitiveIntType)) {
          return annotate(f({ ...node, targetType: "int" }), type);
        }
      }
    },
  };
}
