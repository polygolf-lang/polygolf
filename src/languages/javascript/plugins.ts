import {
  type Node,
  builtin,
  forEachKey,
  indexCall,
  isInt,
  text,
  id,
  block,
  assignment,
  op,
  annotate,
  tableType,
  textType,
  integerType,
  isOp,
  infix,
  functionCall,
  isForRange,
} from "../../IR";

export function propertyCallToIndexCall(node: Node) {
  if (node.kind === "PropertyCall") {
    return indexCall(node.object, text(node.ident.name));
  }
}

export function forRangeToForEachKey(node: Node) {
  if (isForRange(node) && node.variable !== undefined) {
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
      return forEachKey(
        loopVar,
        annotate(
          builtin(
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
          tableType(textType(integerType(1, 2), true), textType()),
        ),
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
