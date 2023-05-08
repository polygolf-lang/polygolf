import {
  functionCall,
  id,
  implicitConversion,
  int,
  methodCall,
  polygolfOp,
  stringLiteral,
  textType,
  add1,
} from "../../IR";
import { Language } from "../../common/Language";
import {
  forArgvToForRange,
  forRangeToForRangeInclusive,
  shiftRangeOneUp,
} from "../../plugins/loops";

import emitProgram from "./emit";
import {
  mapOps,
  mapToUnaryAndBinaryOps,
  useIndexCalls,
  flipBinaryOps,
  removeImplicitConversions,
} from "../../plugins/ops";
import { renameIdents } from "../../plugins/idents";
import {
  tempVarToMultipleAssignment,
  addOneToManyAssignments,
} from "../../plugins/block";
import { golfLastPrint, implicitlyConvertPrintArg } from "../../plugins/print";
import { useEquivalentTextOp } from "../../plugins/textOps";
import { assertInt64 } from "../../plugins/types";
import {
  applyDeMorgans,
  bitnotPlugins,
  equalityToInequality,
  useIntegerTruthiness,
} from "../../plugins/arithmetic";

const luaLanguage: Language = {
  name: "Lua",
  extension: "lua",
  emitter: emitProgram,
  golfPlugins: [
    flipBinaryOps,
    golfLastPrint(),
    tempVarToMultipleAssignment,
    equalityToInequality,
    shiftRangeOneUp,
    ...bitnotPlugins,
    applyDeMorgans,
    useIntegerTruthiness,
  ],
  emitPlugins: [
    forArgvToForRange(),
    forRangeToForRangeInclusive,
    implicitlyConvertPrintArg,
    useEquivalentTextOp(true, false),
    mapOps([
      [
        "text_to_int",
        (x) =>
          polygolfOp("mul", int(1n), implicitConversion("text_to_int", x[0])),
      ],
    ]),
    mapOps([
      [
        "text_to_int",
        (x) =>
          polygolfOp("add", int(0n), implicitConversion("text_to_int", x[0])),
      ],
    ]),
    mapOps([
      [
        "argv_get",
        (x) =>
          polygolfOp(
            "list_get",
            { ...id("arg", true), type: textType() },
            x[0]
          ),
      ],
      ["text_get_byte", (x) => methodCall(x[0], "byte", add1(x[1]))],
      ["text_get_byte_slice", (x) => methodCall(x[0], "sub", x[1], add1(x[2]))],
    ]),
    useIndexCalls(true),
  ],
  finalEmitPlugins: [
    mapOps([
      [
        "int_to_text",
        (x) =>
          polygolfOp(
            "concat",
            stringLiteral(""),
            implicitConversion("int_to_text", x[0])
          ),
      ],
    ]),
    mapOps([
      ["text_byte_length", (x) => methodCall(x[0], "len")],
      ["true", () => id("true", true)],
      ["false", () => id("false", true)],
      ["repeat", (x) => methodCall(x[0], "rep", x[1])],
      ["print", (x) => functionCall("io.write", x)],
      ["println", (x) => functionCall("print", x)],
      ["min", (x) => functionCall("math.min", x)],
      ["max", (x) => functionCall("math.max", x)],
      ["abs", (x) => functionCall("math.abs", x)],
      ["argv", (x) => id("arg", true)],
      ["min", (x) => functionCall("math.min", x)],
      ["max", (x) => functionCall("math.max", x)],
      ["abs", (x) => functionCall("math.abs", x)],
      ["int_to_text_byte", (x) => functionCall("string.char", x)],
    ]),
    mapToUnaryAndBinaryOps(
      ["pow", "^"],
      ["not", "not"],
      ["neg", "-"],
      ["list_length", "#"],
      ["bit_not", "~"],
      ["mul", "*"],
      ["div", "//"],
      ["mod", "%"],
      ["add", "+"],
      ["sub", "-"],
      ["concat", ".."],
      ["bit_shift_left", "<<"],
      ["bit_shift_right", ">>"],
      ["bit_and", "&"],
      ["bit_xor", "~"],
      ["bit_or", "|"],
      ["lt", "<"],
      ["leq", "<="],
      ["eq", "=="],
      ["neq", "~="],
      ["geq", ">="],
      ["gt", ">"],
      ["and", "and"],
      ["or", "or"]
    ),
    renameIdents(),
    addOneToManyAssignments(),
    assertInt64,
    removeImplicitConversions,
  ],
};

export default luaLanguage;
