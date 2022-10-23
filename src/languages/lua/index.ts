import {
  functionCall,
  id,
  indexCall,
  int,
  methodCall,
  polygolfOp,
} from "../../IR";
import { Language } from "../../common/Language";
import { forRangeToForRangeInclusive } from "../../plugins/loops";

import emitProgram from "./emit";
import { mapOps, useIndexCalls } from "../../plugins/ops";
import { renameIdents } from "../../plugins/idents";
import { tempVarToMultipleAssignment } from "../../plugins/tempVariables";

const luaLanguage: Language = {
  name: "Lua",
  emitter: emitProgram,
  plugins: [
    tempVarToMultipleAssignment,
    forRangeToForRangeInclusive,
    useIndexCalls(true),
    mapOps([
      [
        "argv_get",
        (x) => indexCall(id("arg", true), polygolfOp("add", x[0], int(1n))),
      ],
      [
        "str_get_byte",
        (x) => methodCall(x[0], [polygolfOp("add", x[1], int(1n))], "byte"),
      ],
    ]),
    mapOps([
      ["str_length", (x) => methodCall(x[0], [], "len")],
      ["int_to_str", (x) => functionCall(x, "tostring")],
      ["repeat", (x) => methodCall(x[0], [x[1]], "rep")],
      ["print", (x) => functionCall(x, "io.write")],
      ["printnl", (x) => functionCall(x, "print")],
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
      ["argv", (x) => id("argv", true)],
      ["min", (x) => functionCall(x, "math.min")],
      ["max", (x) => functionCall(x, "math.max")],
      ["abs", (x) => functionCall(x, "math.abs")],
      ["byte_to_char", (x) => functionCall(x, "string.char")],
    ]),
    renameIdents(),
  ],
};

export default luaLanguage;
