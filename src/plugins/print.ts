import { replaceAtIndex } from "../common/arrays";
import { Plugin } from "../common/Language";
import { implicitConversion, isPolygolfOp, polygolfOp, text } from "../IR";
import { mapOps } from "./ops";

export const printLnToPrint = mapOps([
  "println",
  (x) => polygolfOp("print", polygolfOp("concat", x[0], text("\n"))),
]);

/**
 * Since code.golf strips output whitespace, for the last print,
 * it doesn't matter if print or println is used, so the shorter one should be used.
 */
export function golfLastPrint(toPrintln = true): Plugin {
  return {
    name: "golfLastPrint",
    visit(program) {
      if (program.kind !== "Program") return;
      const newOp = toPrintln ? ("println" as const) : ("print" as const);
      const oldOp = toPrintln ? "print" : "println";
      if (isPolygolfOp(program.body, oldOp)) {
        return { ...program, body: { ...program.body, op: newOp } };
      } else if (program.body.kind === "Block") {
        const oldChildren = program.body.children;
        const lastStatement = oldChildren[oldChildren.length - 1];
        if (isPolygolfOp(lastStatement, oldOp)) {
          const newLastStatement = { ...lastStatement, op: newOp };
          const children = replaceAtIndex(
            oldChildren,
            oldChildren.length - 1,
            newLastStatement
          );
          return { ...program, body: { ...program.body, children } };
        }
      }
    },
  };
}

export const implicitlyConvertPrintArg: Plugin = {
  name: "implicitlyConvertPrintArg",
  visit(node, spine) {
    if (
      isPolygolfOp(node, "int_to_text") &&
      isPolygolfOp(spine.parent!.node, "print", "println")
    ) {
      return implicitConversion(node.op, node.args[0]);
    }
  },
};
