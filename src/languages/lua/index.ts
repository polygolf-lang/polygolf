import removeMutatingBinaryOp from "../../plugins/removeMutatingBinaryOp";

import emitProgram from "./emit";
import transformBuiltins from "./transformBuiltins";

const luaLanguage = {
  name: "Lua",
  plugins: [removeMutatingBinaryOp, transformBuiltins],
  emitter: emitProgram,
};

export default luaLanguage;
