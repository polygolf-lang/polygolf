import { type Spine } from "../../common/Spine";
import { implicitConversion, isOp, type Node } from "../../IR";

export function implicitlyConvertConcatArg(node: Node, spine: Spine) {
  if (
    isOp.int_to_dec(node) &&
    !spine.isRoot &&
    isOp("concat[Text]")(spine.parent!.node)
  ) {
    return implicitConversion(node.op, node.args[0]);
  }
}
