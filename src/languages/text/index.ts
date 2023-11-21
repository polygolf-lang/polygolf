import { getOutput } from "../../interpreter";
import type { Language } from "../../common/Language";

const textLanguage: Language = {
  name: "Text",
  extension: "txt",
  phases: [],
  emitter: getOutput,
};

export default textLanguage;
