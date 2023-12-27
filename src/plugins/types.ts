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

function needsBigint(
  primitiveIntType: IntegerType,
  allowed: Partial<Record<OpCode | Assignment["kind"], "bigint" | "int">>,
  node: Node,
  spine: Spine,
): boolean {
  const nodeType = getType(isAssignment(node) ? node.variable : node, spine);
  if (
    isSubtype(nodeType, integerType()) &&
    !isSubtype(nodeType, primitiveIntType) &&
    node.targetType !== "bigint"
  ) {
    return true;
  }
  if (!spine.isRoot) {
    const parent = spine.parent!.node;
    if (isOp()(parent) || isAssignment(parent)) {
      if (
        parent.targetType === "bigint" ||
        node.targetType === "bigint" ||
        (isSubtype(nodeType, integerType()) &&
          isOp()(node) &&
          spine
            .getChildSpines()
            .some((s) => needsBigint(primitiveIntType, allowed, s.node, s)))
      ) {
        const op = isOp()(parent) ? parent.op : "Assignment";
        const res = (allowed as any)[op];
        if (res === undefined) {
          throw new PolygolfError(
            `Operation that is not supported on bigints encountered. (${op})`,
          );
        }
        if (res === "bigint" && node.targetType !== "bigint") {
          return true;
        }
      }
    }
  }
  return false;
}

export function floodBigints(
  primitiveIntType0: "int64" | "int53" | IntegerType,
  allowed: Partial<Record<OpCode | Assignment["kind"], "bigint" | "int">>,
): Plugin {
  const primitiveIntType = type(primitiveIntType0) as IntegerType;
  return {
    name: "floodBigints",
    visit(node, spine) {
      if (
        needsBigint(primitiveIntType, allowed, node, spine) &&
        node.targetType !== "bigint"
      ) {
        return { ...node, targetType: "bigint" };
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
