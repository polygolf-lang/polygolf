import { Path, Visitor } from "common/traverse";
import { polygolfOp, stringLiteral } from "../IR";
import { mapOps } from "./ops";

export const printLnToprint = mapOps([
  [
    "println",
    (x) =>
      polygolfOp("print", polygolfOp("text_concat", x[0], stringLiteral("\n"))),
  ],
]);

/**
 * Since code.golf strips output whitespace, for the last print,
 * it doesn't matter if print or println is used, so the shorter one should be used.
 */
export function golfLastPrint(toPrintln = true): Visitor {
  return {
    exit(path: Path) {
      const node = path.node;
      if (node.kind === "Program") {
        if (
          node.body.kind === "PolygolfOp" &&
          (node.body.op === "print" || node.body.op === "println")
        ) {
          node.body.op = toPrintln ? "println" : "print";
        } else if (node.body.kind === "Block") {
          const lastStatement =
            node.body.children[node.body.children.length - 1];
          if (
            lastStatement.kind === "PolygolfOp" &&
            (lastStatement.op === "print" || lastStatement.op === "println")
          ) {
            lastStatement.op = toPrintln ? "println" : "print";
          }
        }
      }
    },
  };
}
