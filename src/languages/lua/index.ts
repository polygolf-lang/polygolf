import { Language, defaultIdentGen } from "../../common/Language";
import { removeMutatingBinaryOp } from "../../plugins/mutatingBinaryOps";
import { oneIndexed } from "../../plugins/oneIndexed";

import emitProgram from "./emit";
import transformBuiltins from "./transformBuiltins";

const luaLanguage: Language = {
  name: "Lua",
  plugins: [removeMutatingBinaryOp, transformBuiltins, oneIndexed],
  emitter: emitProgram,
  identGen: defaultIdentGen,
};

export default luaLanguage;
