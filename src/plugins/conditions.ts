import { Spine } from "@/common/Spine";
import { Plugin } from "../common/Language";
import {
  arrayConstructor,
  conditional,
  Expr,
  ifStatement,
  int,
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

export function conditionalOpToAndOr(
  isProvablyThruthy: (expr: Expr, spine: Spine) => boolean,
  falseyFallback?: "list" | "array"
): Plugin {
  return {
    name: "conditionalOpToAndOr",
    bakeType: true,
    visit(node, spine) {
      if (node.kind === "ConditionalOp") {
        if (isProvablyThruthy(node.consequent, spine.getChild("consequent")))
          return polygolfOp(
            "unsafe_or",
            polygolfOp("unsafe_and", node.condition, node.consequent),
            node.alternate
          );
        if (falseyFallback !== undefined) {
          const op = `${falseyFallback}_get` as const;
          const collection =
            falseyFallback === "list" ? listConstructor : arrayConstructor;
          return polygolfOp(
            op,
            polygolfOp(
              "unsafe_or",
              polygolfOp(
                "unsafe_and",
                node.condition,
                collection([node.consequent])
              ),
              collection([node.alternate])
            ),
            int(0n)
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
