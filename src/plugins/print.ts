import type { Spine } from "../common/Spine";
import { replaceAtIndex } from "../common/arrays";
import { type Plugin } from "../common/Language";
import { block, implicitConversion, isOp, type Node, op, text } from "../IR";
import { mapOps } from "./ops";

export const printLnToPrint = mapOps(
  {
    println: (x) => op("print", op("concat", x[0], text("\n"))),
  },
  "printLnToPrint",
);

/**
 * Since code.golf strips output whitespace, for the last print,
 * it doesn't matter if print or println is used, so the shorter one should be used.
 */
export function golfLastPrint(toPrintln = true): Plugin {
  return {
    name: "golfLastPrint",
    visit(program, spine, context) {
      context.skip("children");
      const newOp = toPrintln ? ("println" as const) : ("print" as const);
      const oldOp = toPrintln ? "print" : "println";
      if (isOp(oldOp)(program)) {
        return { ...program, op: newOp };
      } else if (program.kind === "Block") {
        const oldChildren = program.children;
        const lastStatement = oldChildren[oldChildren.length - 1];
        if (isOp(oldOp)(lastStatement)) {
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

export function implicitlyConvertPrintArg(node: Node, spine: Spine) {
  if (
    isOp("int_to_text")(node) &&
    isOp("print", "println")(spine.parent!.node)
  ) {
    return implicitConversion(node.op, node.args[0]);
  }
}
