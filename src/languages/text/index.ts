import { getOutputOrThrow } from "../../interpreter";
import type { Language } from "../../common/Language";

const textLanguage: Language = {
  name: "Text",
  extension: "txt",
  phases: [],
  emitter: {
    emit(x) {
      return getOutputOrThrow(x).trimEnd();
    },
  },
};

export default textLanguage;
