import { getType } from "../../common/getType";
import { annotate, builtin, isIntLiteral, isPolygolfOp } from "../../IR";
import { Plugin } from "../../common/Language";

export const base10DecompositionToFloatLiteralAsBuiltin: Plugin = {
  name: "base10DecompositionToFloatLiteralAsBuiltin",
  visit(node, spine) {
    if (
      isPolygolfOp(node, "mul") &&
      isIntLiteral(node.args[0]) &&
      isPolygolfOp(node.args[1], "pow") &&
      isIntLiteral(node.args[1].args[0], 10n) &&
      isIntLiteral(node.args[1].args[1])
    ) {
      return annotate(
        builtin(`${node.args[0].value}e${node.args[1].args[1].value}`),
        getType(node, spine)
      );
    }
    if (
      isPolygolfOp(node, "pow") &&
      isIntLiteral(node.args[0], 10n) &&
      isIntLiteral(node.args[1])
    ) {
      return annotate(builtin(`1e${node.args[1].value}`), getType(node, spine));
    }
  },
};
