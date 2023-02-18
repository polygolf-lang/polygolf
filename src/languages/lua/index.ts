import { functionCall, id, methodCall, polygolfOp } from "../../IR";
import { Language } from "../../common/Language";
import {
  forArgvToForRange,
  forRangeToForRangeInclusive,
} from "../../plugins/loops";

import emitProgram from "./emit";
import {
  equalityToInequality,
  mapOps,
  mapPrecedenceOps,
  plus1,
  useIndexCalls,
} from "../../plugins/ops";
import { renameIdents } from "../../plugins/idents";
import { tempVarToMultipleAssignment } from "../../plugins/tempVariables";
import { evalStaticExpr } from "../../plugins/static";
import { flipBinaryOps } from "../../plugins/binaryOps";
import { golfLastPrint } from "../../plugins/print";
import { assertInt64 } from "../../plugins/types";

const luaLanguage: Language = {
  name: "Lua",
  extension: "lua",
  emitter: emitProgram,
  golfPlugins: [
    flipBinaryOps,
    evalStaticExpr,
    golfLastPrint(),
    tempVarToMultipleAssignment,
    equalityToInequality,
  ],
  emitPlugins: [
    forArgvToForRange(),
    forRangeToForRangeInclusive,
    mapOps([
      ["argv_get", (x) => polygolfOp("list_get", id("arg", true), x[0])],
      ["text_get_byte", (x) => methodCall(x[0], [plus1(x[1])], "byte")],
      ["text_get_slice", (x) => methodCall(x[0], [x[1], plus1(x[2])], "sub")],
    ]),
    useIndexCalls(true),
  ],
  finalEmitPlugins: [
    mapOps([
      ["true", (_) => id("true", true)],
      ["false", (_) => id("false", true)],
      ["text_length", (x) => methodCall(x[0], [], "len")],
      ["int_to_text", (x) => functionCall(x, "tostring")],
      ["repeat", (x) => methodCall(x[0], [x[1]], "rep")],
      ["print", (x) => functionCall(x, "io.write")],
      ["println", (x) => functionCall(x, "print")],
      ["min", (x) => functionCall(x, "math.min")],
      ["max", (x) => functionCall(x, "math.max")],
      ["abs", (x) => functionCall(x, "math.abs")],
      ["argv", (x) => id("arg", true)],
      ["min", (x) => functionCall(x, "math.min")],
      ["max", (x) => functionCall(x, "math.max")],
      ["abs", (x) => functionCall(x, "math.abs")],
      ["byte_to_char", (x) => functionCall(x, "string.char")],
    ]),
    mapPrecedenceOps(
      [["pow", "^"]],
      [
        ["not", "not"],
        ["neg", "-"],
        ["list_length", "#"],
        ["bit_not", "~"],
        ["text_to_int", "- -"],
      ],
      [
        ["mul", "*"],
        ["div", "//"],
        ["mod", "%"],
      ],
      [
        ["add", "+"],
        ["sub", "-"],
      ],
      [["text_concat", ".."]],
      [["bit_and", "&"]],
      [["bit_xor", "~"]],
      [["bit_or", "|"]],
      [
        ["lt", "<"],
        ["leq", "<="],
        ["eq", "=="],
        ["neq", "~="],
        ["geq", ">="],
        ["gt", ">"],
      ],
      [["and", "and"]],
      [["or", "or"]]
    ),
    renameIdents(),
    assertInt64,
  ],
};

export default luaLanguage;
