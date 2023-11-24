import type { Visitor } from "@/common/Spine";
import type { Plugin } from "../common/Language";
import {
  array,
  conditional,
  ifStatement,
  int,
  keyValue,
  list,
  op,
  table,
} from "../IR";

export function safeConditionalOpToCollectionGet(
  type: "array" | "list" | "table",
): Plugin {
  return {
    name: "safeConditionalOpToCollectionGet",
    visit(node) {
      if (node.kind === "ConditionalOp" && node.isSafe) {
        switch (type) {
          case "array":
            return op(
              "array_get",
              array([node.alternate, node.consequent]),
              op("bool_to_int", node.condition),
            );
          case "list":
            return op(
              "list_get",
              list([node.alternate, node.consequent]),
              op("bool_to_int", node.condition),
            );
          case "table":
            return op(
              "table_get",
              table([
                keyValue(op("true"), node.consequent),
                keyValue(op("false"), node.alternate),
              ]),
              node.condition,
            );
        }
      }
    },
  };
}

export function conditionalOpToAndOr(
  isProvablyThruthy: Visitor<boolean>,
  falseyFallback?: "list" | "array",
): Plugin {
  return {
    name: "conditionalOpToAndOr",
    bakeType: true,
    visit(node, spine, context) {
      if (node.kind === "ConditionalOp") {
        if (
          isProvablyThruthy(
            node.consequent,
            spine.getChild("consequent"),
            context,
          )
        )
          return op(
            "unsafe_or",
            op("unsafe_and", node.condition, node.consequent),
            node.alternate,
          );
        if (falseyFallback !== undefined) {
          const opCode = `${falseyFallback}_get` as const;
          const collection = falseyFallback === "list" ? list : array;
          return op(
            opCode,
            op(
              "unsafe_or",
              op("unsafe_and", node.condition, collection([node.consequent])),
              collection([node.alternate]),
            ),
            int(0n),
          );
        }
      }
    },
  };
}

export const flipConditionalOp: Plugin = {
  name: "flipConditionalOp",
  visit(node) {
    if (node.kind === "ConditionalOp" && node.isSafe) {
      return conditional(
        op("not", node.condition),
        node.alternate,
        node.consequent,
        true,
      );
    }
  },
};

export const flipIfStatement: Plugin = {
  name: "flipIfStatement",
  visit(node) {
    if (node.kind === "If" && node.alternate !== undefined) {
      return ifStatement(
        op("not", node.condition),
        node.alternate,
        node.consequent,
      );
    }
  },
};
