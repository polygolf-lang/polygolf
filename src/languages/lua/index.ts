import { functionCall, methodCall } from "../../IR";
import { Language } from "../../common/Language";
import { oneIndexed } from "../../plugins/oneIndexed";
import { forRangeToForRangeInclusive } from "../../plugins/loops";

import emitProgram from "./emit";
import { mapOps } from "../../plugins/ops";
import { renameIdents } from "../../plugins/idents";
import { tempVarToMultipleAssignment } from "../../plugins/tempVariables";

const luaLanguage: Language = {
  name: "Lua",
  emitter: emitProgram,
  plugins: [
    tempVarToMultipleAssignment,
    forRangeToForRangeInclusive,
    oneIndexed,
    mapOps([
      ["str_length", (x) => methodCall(x[0], [], "len")],
      ["int_to_str", (x) => functionCall([x[0]], "tostring")],
      ["repeat", (x) => methodCall(x[0], [x[1]], "rep")],
      ["print", (x) => functionCall([x[0]], "io.write")],
      ["printnl", (x) => functionCall([x[0]], "print")],
      ["add", "+"],
      ["sub", "-"],
      ["mul", "*"],
      ["div", "//"],
      ["exp", "^"],
      ["mod", "%"],
      ["bitand", "&"],
      ["bitor", "|"],
      ["bitxor", "~"],
      ["lt", "<"],
      ["leq", "<="],
      ["eq", "=="],
      ["geq", ">="],
      ["gt", ">"],
      ["and", "and"],
      ["or", "or"],
      ["not", ["not", 120]],
      ["str_concat", ".."],
      ["neg", "-"],
      ["bitnot", "~"],
      ["str_to_int", "~~"],
    ]),
    renameIdents(),
  ],
};

export default luaLanguage;
