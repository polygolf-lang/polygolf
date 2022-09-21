import { functionCall, IR, methodCall } from "../../IR";
import { Language, defaultIdentGen } from "../../common/Language";
import { removeMutatingBinaryOp } from "../../plugins/mutatingBinaryOps";
import { oneIndexed } from "../../plugins/oneIndexed";
import { forRangeToForRangeInclusive } from "../../plugins/loops";

import emitProgram from "./emit";

const luaLanguage: Language = {
  name: "Lua",
  plugins: [removeMutatingBinaryOp, forRangeToForRangeInclusive, oneIndexed],
  emitter: emitProgram,
  identGen: defaultIdentGen,
  opMap: new Map<string, string | ((arg: IR.Expr, arg2?: IR.Expr) => IR.Expr)>([
    ["str_length", (x) => methodCall("str_length", x, [], "len")],
    ["int_to_str", (x) => functionCall("int_to_str", [x], "tostring")],
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
    ["and", " and "],
    ["or", " or "],
    ["str_concat", ".."],
    ["neg", "-"],
    ["bitnot", "~"],
    ["str_to_int", "~~"],
  ]),
};

export default luaLanguage;
