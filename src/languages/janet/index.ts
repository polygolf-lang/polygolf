import { Language, required, search } from "../../common/Language";
import emitProgram from "./emit";
import { usePrimaryTextOps } from "../../plugins/textOps";
import { hardcode } from "../../plugins/static";
import { mapToPrefixAndInfix } from "../../plugins/ops";

const janetLanguage: Language = {
  name: "Janet",
  extension: "janet",
  emitter: emitProgram,
  phases: [
    required(
      mapToPrefixAndInfix({
        add: "+",
      }),
    ),
  ],
};

export default janetLanguage;
