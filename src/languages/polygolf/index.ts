import { variants } from "../../IR";
import { defaultDetokenizer, Language } from "../../common/Language";

import emitProgram from "./emit";
import { Path, Visitor } from "../../common/traverse";

const blocksAsVariants: Visitor = {
  tag: "mutatingVisitor",
  name: "blocksAsVariants",
  exit(path: Path) {
    const node = path.node;
    if (
      node.kind === "Block" &&
      path.parent !== null &&
      path.parent.node.kind !== "Variants" &&
      path.parent.node.kind !== "Program"
    ) {
      path.replaceWith(variants([node]));
    }
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
