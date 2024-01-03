import { getType } from "../../common/getType";
import {
  type Node,
  annotate,
  builtin,
  int,
  isOp,
  isText,
  rangeIndexCall,
  text,
  isInt,
  forEach,
  op,
} from "../../IR";
import { chars } from "../../common/strings";
import type { Spine } from "../../common/Spine";

export function golfTextListLiteralIndex(node: Node, spine: Spine) {
  if (
    node.kind === "IndexCall" &&
    node.collection.kind === "List" &&
    node.collection.value.every(isText())
  ) {
    const values = node.collection.value.map((x) => ({
      chars: chars(x.value),
      targetLength: 0,
    }));
    // the length can never increase and it can only decrease by one
    values.forEach((x, i) => {
      x.targetLength = Math.max(
        ...values.map((y, j) => y.chars.length - Number(j < i)),
      );
    });
    if (
      values.every((x) => x.chars.length === x.targetLength) ||
      isOp("println[Text]")(spine.parent!.node)
    ) {
      values.forEach((x) => {
        while (x.chars.length < x.targetLength) x.chars.push(" ");
      });
      const combined = values[0].chars
        .flatMap((_, i) => values.map((x) => x.chars[i]))
        .filter((x) => x !== undefined)
        .join("");
      return annotate(
        rangeIndexCall(
          text(combined),
          node.index,
          builtin(""),
          int(values.length),
        ),
        getType(node, spine),
      );
    }
  }
}

export function indexlessForRangeToForAscii(node: Node) {
  if (
    node.kind === "ForEach" &&
    isOp("range_excl")(node.collection) &&
    isInt(0n)(node.collection.args[0]) &&
    isInt(1n)(node.collection.args[2]) &&
    node.variable === undefined
  ) {
    return forEach(
      undefined,
      op.repeat(text("X"), node.collection.args[1]),
      node.body,
    );
  }
}
