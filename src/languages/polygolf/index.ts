import type { Spine } from "../../common/Spine";
import { type Node, variants } from "../../IR";
import {
  defaultDetokenizer,
  type Language,
  required,
} from "../../common/Language";
import emitProgram from "./emit";

function blocksAsVariants(node: Node, spine: Spine) {
  if (
    node.kind === "Block" &&
    !spine.isRoot &&
    spine.parent!.node.kind !== "Variants"
  )
    return variants([node]);
}

const polygolfLanguage: Language = {
  name: "Polygolf",
  extension: "polygolf",
  emitter: emitProgram,
  phases: [required(blocksAsVariants)],
  detokenizer: defaultDetokenizer(
    (a, b) =>
      a !== "(" &&
      b !== ")" &&
      b !== ";" &&
      b !== ":" &&
      a !== ":" &&
      a !== "\n" &&
      b !== "\n",
    2,
  ),
};

export default polygolfLanguage;
