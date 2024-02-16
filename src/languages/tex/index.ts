import emitProgram from "./emit";
import { mapUnaryAndBinary } from "../../plugins/ops";
import { forRangeToWhile, whileToRecursion } from "../../plugins/loops";
import { lettersOnlyIdentGen, renameIdents } from "../../plugins/idents";
import { type Language, required } from "../../common/Language";
import {
  stuffToMacros,
  insertAccumulatedCounters,
  exprTreeToFlat2AC,
  addTeXHelpers,
  macroParamsToHash,
} from "./plugins";
import { texDetokenizer } from "./detokenizer";

const texLanguage: Language = {
  name: "TeX",
  extension: "tex",
  emitter: emitProgram,
  detokenizer: texDetokenizer,
  phases: [
    required(
      forRangeToWhile,
      whileToRecursion,
      mapUnaryAndBinary(
        {
          mul: "\\multiply",
          /** helper_mod is defined in addTeXImports */
          mod: "helper_mod",
          // TODO: check if TeX is trunc div or floor div.
          div: "\\divide",
          add: "\\advance",
          sub: "helper_sub",
        },
        true,
      ),
      exprTreeToFlat2AC,
      addTeXHelpers,
      stuffToMacros,
      insertAccumulatedCounters,
      renameIdents({
        preferred: (o) => lettersOnlyIdentGen.preferred(o).map((w) => "\\" + w),
        short: ["~"].concat(lettersOnlyIdentGen.short.map((c) => "\\" + c)),
        general: (i) => "\\" + lettersOnlyIdentGen.general(i),
        reserved: [],
      }),
      macroParamsToHash,
    ),
  ],
};

export default texLanguage;
