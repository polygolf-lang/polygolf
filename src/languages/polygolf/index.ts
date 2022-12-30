import { variants } from "../../IR";
import { defaultDetokenizer, Plugin, Language } from "../../common/Language";
import emitProgram from "./emit";

const blocksAsVariants: Plugin = {
  name: "blocksAsVariants",
  visit(node, spine) {
    if (
      node.kind === "Block" &&
      spine.parent !== null &&
      spine.parent.node.kind !== "Variants" &&
      spine.parent.node.kind !== "Program"
    )
      return variants([node]);
  },
};

const polygolfLanguage: Language = {
  name: "Polygolf",
  emitter: emitProgram,
  golfPlugins: [],
  emitPlugins: [],
  finalEmitPlugins: [blocksAsVariants],
  detokenizer: defaultDetokenizer(
    (a, b) =>
      a !== "(" &&
      b !== ")" &&
      b !== ";" &&
      b !== ":" &&
      a !== ":" &&
      a !== "\n" &&
      b !== "\n",
    2
  ),
};

export default polygolfLanguage;
