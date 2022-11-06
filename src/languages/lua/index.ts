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
        "text_get_byte",
        (x) => methodCall(x[0], [polygolfOp("add", x[1], int(1n))], "byte"),
      ],
      ["true", (_) => id("true", true)],
      ["false", (_) => id("false", true)],
    ]),
    mapOps([
      ["text_length", (x) => methodCall(x[0], [], "len")],
      ["int_to_text", (x) => functionCall(x, "tostring")],
      ["repeat", (x) => methodCall(x[0], [x[1]], "rep")],
      ["print", (x) => functionCall(x, "io.write")],
      ["println", (x) => functionCall(x, "print")],
      ["add", "+"],
      ["sub", "-"],
      ["mul", "*"],
      ["div", "//"],
      ["pow", "^"],
      ["mod", "%"],
      ["bit_and", "&"],
      ["bit_or", "|"],
      ["bit_xor", "~"],
      ["lt", "<"],
      ["leq", "<="],
      ["eq", "=="],
      ["geq", ">="],
      ["gt", ">"],
      ["and", "and"],
      ["or", "or"],
      ["not", ["not", 120]],
      ["text_concat", ".."],
      ["neg", "-"],
      ["bit_not", "~"],
      ["text_to_int", "~~"],
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
