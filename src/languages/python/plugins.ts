import { getType } from "../../common/getType";
import {
  annotate,
  builtin,
  int,
  isPolygolfOp,
  isTextLiteral,
  rangeIndexCall,
  text,
} from "../../IR";
import { type Plugin } from "../../common/Language";
import { chars } from "../../common/strings";

export const golfTextListLiteralIndex: Plugin = {
  name: "golfTextListLiteralIndex",
  visit(node, spine) {
    if (
      node.kind === "IndexCall" &&
      node.collection.kind === "ListConstructor" &&
      node.collection.exprs.every(isTextLiteral())
    ) {
      const values = node.collection.exprs.map((x) => ({
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
        isPolygolfOp("println")(spine.parent!.node)
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
  },
};
