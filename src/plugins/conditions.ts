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

export function safeConditionalOpToAt(
  type: "Array" | "List" | "Table",
): Plugin {
  return {
    name: "safeConditionalOpToAt",
    visit(node) {
      if (node.kind === "ConditionalOp" && node.isSafe) {
        switch (type) {
          case "Array":
            return op["at[Array]"](
              array([node.alternate, node.consequent]),
              op.bool_to_int(node.condition),
            );
          case "List":
            return op["at[List]"](
              list([node.alternate, node.consequent]),
              op.bool_to_int(node.condition),
            );
          case "Table":
            return op["at[Table]"](
              table([
                keyValue(op.true, node.consequent),
                keyValue(op.false, node.alternate),
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
  falseyFallback?: "List" | "Array",
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
          return op.unsafe_or(
            op.unsafe_and(node.condition, node.consequent),
            node.alternate,
          );
        if (falseyFallback !== undefined) {
          const opCode = `at[${falseyFallback}]` as const;
          const collection = falseyFallback === "List" ? list : array;
          return op[opCode](
            op.unsafe_or(
              op.unsafe_and(node.condition, collection([node.consequent])),
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
        op.not(node.condition),
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
        op.not(node.condition),
        node.alternate,
        node.consequent,
      );
    }
  },
};
