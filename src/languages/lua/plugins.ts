import {
  type Node,
  annotate,
  builtin,
  integerType,
  isInt,
  isOp,
} from "../../IR";

export function base10DecompositionToFloatLiteralAsBuiltin(node: Node) {
  let k = 1n;
  let pow: Node = node;
  if (isOp.mul(node) && isInt()(node.args[0])) {
    k = node.args[0].value;
    pow = node.args[1];
  }

  if (isOp.pow(pow) && isInt(10n)(pow.args[0]) && isInt()(pow.args[1])) {
    const e = pow.args[1].value;
    const value = k * 10n ** e;
    return annotate(builtin(`${k}e${e}`), integerType(value, value));
  }
}
