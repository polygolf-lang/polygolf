import type { Spine } from "../../common/Spine";
import {
  type Node,
  builtin,
  indexCall,
  isInt,
  text,
  id,
  block,
  assignment,
  op,
  textType,
  integerType,
  isOp,
  infix,
  functionCall,
  isForEachRange,
  forEach,
  listType,
  isText,
} from "../../IR";
import type { CompilationContext } from "../../common/compile";

export function propertyCallToIndexCall(node: Node) {
  if (node.kind === "PropertyCall") {
    return indexCall(node.object, text(node.ident.name));
  }
}

export function forRangeToForEachKey(node: Node) {
  if (isForEachRange(node) && node.variable !== undefined) {
    const [low, high, step] = node.collection.args;
    if (
      isInt(0n)(low) &&
      isInt(1n)(step) &&
      isInt()(high) &&
      2 <= high.value &&
      high.value <= 37
    ) {
      const end = Number(high.value);
      const loopVar = id(node.variable.name + id().name);
      return forEach(
        loopVar,
        {
          ...builtin(
            [
              "'??'",
              "'???'",
              "''+!0",
              "''+!1",
              "''+1e5",
              "''+1e6",
              "''+1e7",
              "''+1e8",
              "''+1e9",
              "''+1e10",
              "''+1e11",
              "''+1e12",
              "''+1e13",
              "''+{}",
              "{}+1",
              "{}+11",
              "{}+.1",
              "{}+!0",
              "{}+!1",
              "{}+1e5",
              "{}+1e6",
              "{}+1e7",
              "{}+1e8",
              "{}+1e9",
              "{}+1e10",
              "{}+1e11",
              "{}+1e12",
              "{}+1e13",
              "{}+{}",
              "{}+1e15",
              "''+Map",
              " 1+Map",
              "-1+Map",
              ".1+Map",
              "!0+Map",
              "!1+Map",
              "{}+Map",
            ][end - 2],
          ),
          type: listType(textType(integerType(1, 2), true)),
          targetType: "object",
        },
        block([assignment(node.variable, op.dec_to_int(loopVar)), node.body]),
      );
    }
  }
}

export function numberDivisionToSlash(node: Node) {
  // TODO - this looks sus
  if (isOp.div(node) && node.targetType !== "bigint") {
    return functionCall("Math.floor", infix("/", ...node.args));
  }
  if (isOp.trunc_div(node) && node.targetType !== "bigint") {
    return functionCall("Math.floor", infix("/", ...node.args));
  }
}

export function useRegexAsReplacePattern(
  node: Node,
  spine: Spine,
  context: CompilationContext,
) {
  if (isOp.replace(node)) {
    const [a, b, c] = node.args;
    if (
      isText()(b) &&
      b.targetType !== "regex g" &&
      [...b.value]
        .map((x, i) => b.value.charCodeAt(i))
        .every(
          (x) =>
            context.options.codepointRange[0] <= x &&
            x <= context.options.codepointRange[1],
        )
    ) {
      return op.replace(a, { ...b, targetType: "regex g" }, c);
    }
  }
}
