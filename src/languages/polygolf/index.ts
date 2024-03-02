import type { Spine } from "../../common/Spine";
import { type Node, variants } from "../../IR";
import { type Language, required } from "../../common/Language";
import { PolygolfEmitter } from "./emit";

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
  emitter: new PolygolfEmitter(),
  phases: [required(blocksAsVariants)],
};

export default polygolfLanguage;
