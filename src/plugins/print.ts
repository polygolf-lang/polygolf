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

export const printLnToPrint = mapOps({
  "println[Text]": (a) => op["print[Text]"](op["concat[Text]"](a, text("\n"))),
});

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
      const newOp = toPrintln ? "println[Text]" : "print[Text]";
      const oldOp = toPrintln ? "print[Text]" : "println[Text]";
      const lastStatement = statements[statements.length - 1];
      if (isOp(oldOp, newOp)(lastStatement)) {
        let arg = lastStatement.args[0];
        if (isText()(arg)) {
          const value = arg.value.trimEnd();
          if (value !== arg.value) arg = text(value);
        }
        if (arg !== lastStatement.args[0] || lastStatement.op !== newOp) {
          return blockOrSingle(
            replaceAtIndex(statements, statements.length - 1, op[newOp](arg)),
          );
        }
      }
    },
  };
}

/**
 * Like golfLastPrint but for print[Int] instead of print[Text]
 */
export function golfLastPrintInt(toPrintlnInt = true): Plugin {
  return {
    name: "golfLastPrintInt",
    visit(program, spine, context) {
      context.skipChildren();
      const statements = block([program]).children;
      const newOp = toPrintlnInt ? "println[Int]" : "print[Int]";
      const oldOp = toPrintlnInt ? "print[Int]" : "println[Int]";
      const lastStatement = statements[statements.length - 1];
      if (isOp(oldOp)(lastStatement)) {
        return blockOrSingle(
          replaceAtIndex(
            statements,
            statements.length - 1,
            op[newOp](lastStatement.args[0]),
          ),
        );
      }
    },
  };
}

export function implicitlyConvertPrintArg(node: Node, spine: Spine) {
  if (
    isOp("int_to_dec")(node) &&
    !spine.isRoot &&
    isOp("print[Text]", "println[Text]")(spine.parent!.node)
  ) {
    return implicitConversion(node.op, node.args[0]);
  }
}

export const printToImplicitOutput = mapOps({
  "print[Text]": (a) => a,
});

export function printConcatToMultiPrint(node: Node, spine: Spine) {
  if (isOp("print[Text]")(node) && isOp("concat[Text]")(node.args[0])) {
    return block(node.args[0].args.map(op["print[Text]"]));
  }
}

export const putcToPrintChar = mapOps({
  "putc[Ascii]": (a) => op["print[Text]"](op["char[Ascii]"](a)),
  "putc[byte]": (a) => op["print[Text]"](op["char[byte]"](a)),
  "putc[codepoint]": (a) => op["print[Text]"](op["char[codepoint]"](a)),
});

export function mergePrint(
  program: Node,
  spine: Spine,
  context: VisitorContext,
) {
  context.skipChildren();
  const variable = id();
  if (spine.countNodes(isOp("print[Text]", "println[Text]")) > 1) {
    const newSpine = spine.withReplacer((node) =>
      isOp("print[Text]", "println[Text]")(node)
        ? assignment(
            variable,
            op["concat[Text]"](
              variable,
              node.args[0],
              ...(node.op === "print[Text]" ? [] : [text("\n")]),
            ),
          )
        : undefined,
    );
    return block([
      assignment(variable, text("")),
      newSpine.node,
      op["print[Text]"](variable),
    ]);
  }
}

export function splitPrint(node: Node, spine: Spine) {
  if (node.kind === "Block") {
    const last = node.children.at(-1)!;
    if (isOp("print[Text]")(last) && isUserIdent()(last.args[0])) {
      const printVar = last.args[0];
      const writes = getWrites(spine, printVar.name);
      if (writes.every((x) => isAssignmentToIdent()(x.parent!.node))) {
        const assignments = writes.map((x) => x.parent?.node as Assignment);
        if (
          assignments.every(
            (x, i) =>
              i < 1 ||
              (isOp("concat[Text]")(x.expr) &&
                isIdent(printVar)(x.expr.args[0])),
          )
        ) {
          return spine.withReplacer((x) =>
            x === node
              ? blockOrSingle(node.children.slice(0, -1))
              : x === assignments[0]
              ? isText("")(x.expr)
                ? block([])
                : op["print[Text]"](x.expr)
              : assignments.includes(x as any)
              ? op["print[Text]"](((x as Assignment).expr as Op).args[1]!)
              : undefined,
          ).node;
        }
      }
    }
  }
}
