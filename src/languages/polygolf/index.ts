import { variants } from "../../IR";
import {
  defaultDetokenizer,
  GolfPlugin,
  Language,
} from "../../common/Language";
import emitProgram from "./emit";
import { Spine } from "../../common/Spine";

const blocksAsVariants: GolfPlugin = {
  tag: "golf",
  name: "blocksAsVariants",
  visit(spine: Spine) {
    if (
      spine.node.kind === "Block" &&
      spine.parent !== null &&
      spine.parent.node.kind !== "Variants" &&
      spine.parent.node.kind !== "Program"
    )
      return variants([spine.node]);
  },
};

const polygolfLanguage: Language = {
  name: "Polygolf",
  emitter: emitProgram,
  golfPlugins: [],
  emitPlugins: [blocksAsVariants],
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
