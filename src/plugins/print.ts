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
  id,
  assignment,
  isUserIdent,
  isAssignmentToIdent,
  type Assignment,
  isIdent,
  blockOrSingle,
  type Op,
  isText,
} from "../IR";
import { mapOps } from "./ops";
import type { VisitorContext } from "../common/compile";
import { getWrites } from "../common/symbols";

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

export function mergePrint(
  program: Node,
  spine: Spine,
  context: VisitorContext,
) {
  context.skipChildren();
  const variable = id();
  if (spine.countNodes(isOp("print", "println")) > 1) {
    const newSpine = spine.withReplacer((node) =>
      isOp("print", "println")(node)
        ? assignment(
            variable,
            op(
              "concat",
              variable,
              node.args[0],
              ...(node.op === "print" ? [] : [text("\n")]),
            ),
          )
        : undefined,
    );
    return block([
      assignment(variable, text("")),
      newSpine.node,
      op("print", variable),
    ]);
  }
}

export function splitPrint(node: Node, spine: Spine) {
  if (node.kind === "Block") {
    const last = node.children.at(-1)!;
    if (isOp("print")(last) && isUserIdent()(last.args[0])) {
      const printVar = last.args[0];
      const writes = getWrites(spine, printVar.name);
      if (writes.every((x) => isAssignmentToIdent()(x.parent!.node))) {
        const assignments = writes.map((x) => x.parent?.node as Assignment);
        if (
          assignments.every(
            (x, i) =>
              i < 1 ||
              (isOp("concat")(x.expr) && isIdent(printVar)(x.expr.args[0])),
          )
        ) {
          return spine.withReplacer((x) =>
            x === node
              ? blockOrSingle(node.children.slice(0, -1))
              : x === assignments[0]
              ? isText("")(x.expr)
                ? block([])
                : op("print", x.expr)
              : assignments.includes(x as any)
              ? op("print", ((x as Assignment).expr as Op).args[1])
              : undefined,
          ).node;
        }
      }
    }
  }
}
