import { replaceAtIndex } from "../common/arrays";
import { type Plugin } from "../common/Language";
import {
  block,
  implicitConversion,
  isPolygolfOp,
  polygolfOp,
  text,
} from "../IR";
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
    visit(program, spine) {
      if (!spine.isRoot) return;
      const newOp = toPrintln ? ("println" as const) : ("print" as const);
      const oldOp = toPrintln ? "print" : "println";
      if (isPolygolfOp(oldOp)(program)) {
        return { ...program, op: newOp };
      } else if (program.kind === "Block") {
        const oldChildren = program.children;
        const lastStatement = oldChildren[oldChildren.length - 1];
        if (isPolygolfOp(oldOp)(lastStatement)) {
          const newLastStatement = { ...lastStatement, op: newOp };
          const children = replaceAtIndex(
            oldChildren,
            oldChildren.length - 1,
            newLastStatement,
          );
          return block(children);
        }
      }
    },
  };
}

export const implicitlyConvertPrintArg: Plugin = {
  name: "implicitlyConvertPrintArg",
  visit(node, spine) {
    if (
      isPolygolfOp("int_to_text")(node) &&
      isPolygolfOp("print", "println")(spine.parent!.node)
    ) {
      return implicitConversion(node.op, node.args[0]);
    }
  },
};
