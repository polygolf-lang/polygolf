import { Visitor } from "common/traverse";
import { polygolfOp, Program, stringLiteral } from "../IR";
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
    name: "golfLastPrint",
    enterProgram(program: Program) {
      if (
        program.body.kind === "PolygolfOp" &&
        (program.body.op === "print" || program.body.op === "println")
      ) {
        program.body.op = toPrintln ? "println" : "print";
      } else if (program.body.kind === "Block") {
        const lastStatement =
          program.body.children[program.body.children.length - 1];
        if (
          lastStatement.kind === "PolygolfOp" &&
          (lastStatement.op === "print" || lastStatement.op === "println")
        ) {
          lastStatement.op = toPrintln ? "println" : "print";
        }
      }
    },
  };
}
