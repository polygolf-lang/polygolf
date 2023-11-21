import {
  type Node,
  annotate,
  builtin,
  integerType,
  isIntLiteral,
  isOp,
} from "../../IR";

export function base10DecompositionToFloatLiteralAsBuiltin(node: Node) {
  let k = 1n;
  let pow: Node = node;
  if (isOp("mul")(node) && isIntLiteral()(node.args[0])) {
    k = node.args[0].value;
    pow = node.args[1];
  }

  if (
    isOp("pow")(pow) &&
    isIntLiteral(10n)(pow.args[0]) &&
    isIntLiteral()(pow.args[1])
  ) {
    const e = pow.args[1].value;
    const value = k * 10n ** e;
    return annotate(builtin(`${k}e${e}`), integerType(value, value));
  }
}
