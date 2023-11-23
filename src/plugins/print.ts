import type { Spine } from "../common/Spine";
import { replaceAtIndex } from "../common/arrays";
import { type Plugin } from "../common/Language";
import {
  block,
  implicitConversion,
  isOp,
  type Node,
  op,
  text,
  isText,
  blockOrSingle,
} from "../IR";
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
      context.skipChildren();
      const statements = block([program]).children;
      const newOp = toPrintln ? "println" : "print";
      const oldOp = toPrintln ? "print" : "println";
      const lastStatement = statements[statements.length - 1];
      if (isOp(oldOp, newOp)(lastStatement)) {
        let arg = lastStatement.args[0];
        if (isText()(arg)) {
          const value = arg.value.trimEnd();
          if (value !== arg.value) arg = text(value);
        }
        if (arg !== lastStatement.args[0] || lastStatement.op !== newOp) {
          return blockOrSingle(
            replaceAtIndex(statements, statements.length - 1, op(newOp, arg)),
          );
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
