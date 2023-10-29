import {
  type Node,
  annotate,
  builtin,
  integerType,
  isIntLiteral,
  isPolygolfOp,
} from "../../IR";
import { type Plugin } from "../../common/Language";

export const base10DecompositionToFloatLiteralAsBuiltin: Plugin = {
  name: "base10DecompositionToFloatLiteralAsBuiltin",
  visit(node) {
    let k = 1n;
    let pow: Node = node;
    if (isPolygolfOp("mul")(node) && isIntLiteral()(node.args[0])) {
      k = node.args[0].value;
      pow = node.args[1];
    }

    if (
      isPolygolfOp("pow")(pow) &&
      isIntLiteral(10n)(pow.args[0]) &&
      isIntLiteral()(pow.args[1])
    ) {
      const e = pow.args[1].value;
      const value = k * 10n ** e;
      return annotate(builtin(`${k}e${e}`), integerType(value, value));
    }
  },
};
