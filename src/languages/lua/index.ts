import {
  functionCall,
  implicitConversion,
  int,
  methodCall,
  polygolfOp,
  text,
  textType,
  add1,
  builtin,
  listType,
} from "../../IR";
import { Language } from "../../common/Language";
import {
  forArgvToForRange,
  forRangeToForRangeInclusive,
  forRangeToForRangeOneStep,
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
import { alias, renameIdents } from "../../plugins/idents";
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
import { conditionalOpToAndOr } from "../../plugins/conditions";
import { listOpsToTextOps } from "../../plugins/static";

const luaLanguage: Language = {
  name: "Lua",
  extension: "lua",
  emitter: emitProgram,
  golfPlugins: [
    flipBinaryOps,
    golfLastPrint(),
    listOpsToTextOps("text_byte_find", "text_get_byte"),
    tempVarToMultipleAssignment,
    equalityToInequality,
    shiftRangeOneUp,
    ...bitnotPlugins,
    applyDeMorgans,
    useIntegerTruthiness,
    forRangeToForRangeOneStep,
  ],
  emitPlugins: [
    forArgvToForRange(),
    forRangeToForRangeInclusive(),
    implicitlyConvertPrintArg,
    useEquivalentTextOp(true, false),
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
            { ...builtin("arg"), type: listType(textType()) },
            x[0]
          ),
      ],
      ["text_get_byte", (x) => methodCall(x[0], "byte", add1(x[1]))],
      ["text_get_byte_slice", (x) => methodCall(x[0], "sub", x[1], add1(x[2]))]
    ),
    useIndexCalls(true),
  ],
  finalEmitPlugins: [
    conditionalOpToAndOr,
    mapOps([
      "int_to_text",
      (x) =>
        polygolfOp("concat", text(""), implicitConversion("int_to_text", x[0])),
    ]),
    mapOps(
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
            b.kind === "TextLiteral"
              ? text(
                  b.value.replace(/(-|%|\^|\$|\(|\)|\.|\[|\]|\*|\+|\?)/g, "%$1")
                )
              : methodCall(b, "gsub", text("(%W)"), text("%%%1")),
            c.kind === "TextLiteral"
              ? text(c.value.replace("%", "%%"))
              : methodCall(c, "gsub", text("%%"), text("%%%%"))
          ),
      ]
    ),
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
    addOneToManyAssignments(),
    alias((expr) => {
      switch (expr.kind) {
        case "IntegerLiteral":
          return expr.value.toString();
        case "TextLiteral":
          return `"${expr.value}"`;
      }
    }),
    renameIdents(),
    assertInt64,
    removeImplicitConversions,
  ],
};

export default luaLanguage;
