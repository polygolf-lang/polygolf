import {
  functionCall,
  implicitConversion,
  int,
  methodCall,
  polygolfOp,
  text,
  textType,
  add1,
  isTextLiteral,
  builtin,
} from "../../IR";
import {
  type Language,
  required,
  search,
  simplegolf,
} from "../../common/Language";
import {
  forArgvToForRange,
  forRangeToForRangeInclusive,
  forRangeToForRangeOneStep,
  shiftRangeOneUp,
} from "../../plugins/loops";

import emitProgram from "./emit";
import {
  mapOps,
  mapToUnaryAndInfixs,
  useIndexCalls,
  flipBinaryPolygolfOps,
  removeImplicitConversions,
  printIntToPrint,
} from "../../plugins/ops";
import { alias, renameIdents } from "../../plugins/idents";
import {
  tempVarToMultipleAssignment,
  inlineVariables,
} from "../../plugins/block";
import { golfLastPrint, implicitlyConvertPrintArg } from "../../plugins/print";
import {
  textToIntToFirstIndexTextGetToInt,
  useEquivalentTextOp,
} from "../../plugins/textOps";
import { assertInt64 } from "../../plugins/types";
import {
  applyDeMorgans,
  bitnotPlugins,
  decomposeIntLiteral,
  equalityToInequality,
  lowBitsPlugins,
  pickAnyInt,
  useIntegerTruthiness,
} from "../../plugins/arithmetic";
import { listOpsToTextOps } from "../../plugins/static";
import { base10DecompositionToFloatLiteralAsBuiltin } from "./plugins";

const luaLanguage: Language = {
  name: "Lua",
  extension: "lua",
  emitter: emitProgram,
  phases: [
    required(printIntToPrint),
    search(
      flipBinaryPolygolfOps,
      golfLastPrint(),
      listOpsToTextOps("text_byte_find", "text_get_byte"),
      tempVarToMultipleAssignment,
      equalityToInequality,
      shiftRangeOneUp,
      ...bitnotPlugins,
      ...lowBitsPlugins,
      applyDeMorgans,
      useIntegerTruthiness,
      forRangeToForRangeOneStep,
      inlineVariables,
      forArgvToForRange(),
      forRangeToForRangeInclusive(),
      implicitlyConvertPrintArg,
      useEquivalentTextOp(true, false),
      textToIntToFirstIndexTextGetToInt,
      mapOps([
        "text_to_int",
        (x) =>
          polygolfOp("mul", int(1n), implicitConversion("text_to_int", x[0])),
      ]),
      mapOps([
        "text_to_int",
        (x) =>
          polygolfOp("add", int(0n), implicitConversion("text_to_int", x[0])),
      ]),
      mapOps(
        [
          "argv_get",
          (x) =>
            polygolfOp(
              "list_get",
              { ...builtin("arg"), type: textType() },
              x[0],
            ),
        ],
        ["text_get_byte_to_int", (x) => methodCall(x[0], "byte", add1(x[1]))],
        [
          "text_get_byte",
          (x) => methodCall(x[0], "sub", add1(x[1]), add1(x[1])),
        ],
        [
          "text_get_byte_slice",
          (x) => methodCall(x[0], "sub", x[1], add1(x[2])),
        ],
      ),
      useIndexCalls(true),
      decomposeIntLiteral(true, true, true),
    ),
    required(
      pickAnyInt,
      forArgvToForRange(),
      forRangeToForRangeInclusive(),
      implicitlyConvertPrintArg,
      useEquivalentTextOp(true, false),
      textToIntToFirstIndexTextGetToInt,
      mapOps([
        "text_to_int",
        (x) =>
          polygolfOp("mul", int(1n), implicitConversion("text_to_int", x[0])),
      ]),
      mapOps(
        [
          "argv_get",
          (x) =>
            polygolfOp(
              "list_get",
              { ...builtin("arg"), type: textType() },
              x[0],
            ),
        ],
        ["text_get_byte_to_int", (x) => methodCall(x[0], "byte", add1(x[1]))],
        [
          "text_get_byte",
          (x) => methodCall(x[0], "sub", add1(x[1]), add1(x[1])),
        ],
        [
          "text_get_byte_slice",
          (x) => methodCall(x[0], "sub", x[1], add1(x[2])),
        ],
      ),
      useIndexCalls(true),
      mapOps([
        "int_to_text",
        (x) =>
          polygolfOp(
            "concat",
            text(""),
            implicitConversion("int_to_text", x[0]),
          ),
      ]),
      mapOps(
        ["read_line", functionCall("io.read")],
        [
          "join",
          (x) =>
            functionCall("table.concat", isTextLiteral("")(x[1]) ? [x[0]] : x),
        ],
        ["text_byte_length", (x) => methodCall(x[0], "len")],
        ["true", builtin("true")],
        ["false", builtin("false")],
        ["repeat", (x) => methodCall(x[0], "rep", x[1])],
        ["print", (x) => functionCall("io.write", x)],
        ["println", (x) => functionCall("print", x)],
        ["min", (x) => functionCall("math.min", x)],
        ["max", (x) => functionCall("math.max", x)],
        ["abs", (x) => functionCall("math.abs", x)],
        ["argv", (x) => builtin("arg")],
        ["min", (x) => functionCall("math.min", x)],
        ["max", (x) => functionCall("math.max", x)],
        ["abs", (x) => functionCall("math.abs", x)],
        ["int_to_text_byte", (x) => functionCall("string.char", x)],
        [
          "text_replace",
          ([a, b, c]) =>
            methodCall(
              a,
              "gsub",
              isTextLiteral()(b)
                ? text(
                    b.value.replace(
                      /(-|%|\^|\$|\(|\)|\.|\[|\]|\*|\+|\?)/g,
                      "%$1",
                    ),
                  )
                : methodCall(b, "gsub", text("(%W)"), text("%%%1")),
              isTextLiteral()(c)
                ? text(c.value.replace("%", "%%"))
                : methodCall(c, "gsub", text("%%"), text("%%%%")),
            ),
        ],
      ),
    ),
    simplegolf(base10DecompositionToFloatLiteralAsBuiltin),
    required(
      mapToUnaryAndInfixs(
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
        ["or", "or"],
      ),
    ),
    simplegolf(
      alias({
        IntegerLiteral: (x) => x.value.toString(),
        TextLiteral: (x) => `"${x.value}"`,
      }),
    ),
    required(renameIdents(), assertInt64, removeImplicitConversions),
  ],
};

export default luaLanguage;
