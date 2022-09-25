import { functionCall, methodCall } from "../../IR";
import { Language, OpTransformOutput } from "../../common/Language";
import { removeMutatingBinaryOp } from "../../plugins/mutatingBinaryOps";
import { oneIndexed } from "../../plugins/oneIndexed";
import { forRangeToForRangeInclusive } from "../../plugins/loops";

import emitProgram from "./emit";

const luaLanguage: Language = {
  name: "Lua",
  plugins: [removeMutatingBinaryOp, forRangeToForRangeInclusive, oneIndexed],
  emitter: emitProgram,
  opMap: new Map<string, OpTransformOutput>([
    ["str_length", (x, _) => methodCall("str_length", x, [], "len")],
    ["int_to_str", (x, _) => functionCall("int_to_str", [x], "tostring")],
    ["repeat", (x, y) => methodCall("repeat", x, [y], "rep")],
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
};

export default luaLanguage;
