import { Plugin } from "../common/Language";
import {
  arrayConstructor,
  conditional,
  ifStatement,
  keyValue,
  listConstructor,
  polygolfOp,
  tableConstructor,
} from "../IR";

export function safeConditionalOpToCollectionGet(
  type: "array" | "list" | "table"
): Plugin {
  return {
    name: "safeConditionalOpToCollectionGet",
    visit(node) {
      if (node.kind === "ConditionalOp" && node.isSafe) {
        switch (type) {
          case "array":
            return polygolfOp(
              "array_get",
              arrayConstructor([node.alternate, node.consequent]),
              polygolfOp("bool_to_int", node.condition)
            );
          case "list":
            return polygolfOp(
              "list_get",
              listConstructor([node.alternate, node.consequent]),
              polygolfOp("bool_to_int", node.condition)
            );
          case "table":
            return polygolfOp(
              "table_get",
              tableConstructor([
                keyValue(polygolfOp("true"), node.consequent),
                keyValue(polygolfOp("false"), node.alternate),
              ]),
              node.condition
            );
        }
      }
    },
  };
}

export const conditionalOpToAndOr: Plugin = {
  name: "conditionalOpToAndOr",
  bakeType: true,
  visit(node) {
    if (node.kind === "ConditionalOp") {
      return polygolfOp(
        "unsafe_or",
        polygolfOp("unsafe_and", node.condition, node.consequent),
        node.alternate
      );
    }
  },
};

export const flipConditionalOp: Plugin = {
  name: "flipConditionalOp",
  visit(node) {
    if (node.kind === "ConditionalOp" && node.isSafe) {
      return conditional(
        polygolfOp("not", node.condition),
        node.alternate,
        node.consequent,
        true
      );
    }
  },
};

export const flipIfStatement: Plugin = {
  name: "flipIfStatement",
  visit(node) {
    if (node.kind === "IfStatement" && node.alternate !== undefined) {
      return ifStatement(
        polygolfOp("not", node.condition),
        node.alternate,
        node.consequent
      );
    }
  },
};
