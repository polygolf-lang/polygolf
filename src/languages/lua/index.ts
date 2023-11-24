import {
  functionCall as func,
  implicitConversion,
  int,
  methodCall as method,
  op,
  text,
  textType,
  add1,
  isText,
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
  mapToPrefixAndInfix,
  useIndexCalls,
  flipBinaryOps,
  removeImplicitConversions,
  printIntToPrint,
  mapTo,
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
import { hardcode, listOpsToTextOps } from "../../plugins/static";
import { base10DecompositionToFloatLiteralAsBuiltin } from "./plugins";
import { getType } from "../../common/getType";
import { conditionalOpToAndOr } from "../../plugins/conditions";

const luaLanguage: Language = {
  name: "Lua",
  extension: "lua",
  emitter: emitProgram,
  phases: [
    search(hardcode()),
    required(printIntToPrint),
    simplegolf(golfLastPrint()),
    search(
      flipBinaryOps,
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
      mapOps({
        text_to_int: (x) =>
          op("add", int(0n), implicitConversion("text_to_int", x[0])),
        argv_get: (x) =>
          op("list_get", { ...builtin("arg"), type: textType() }, x[0]),

        text_get_byte_to_int: (x) => method(x[0], "byte", add1(x[1])),
        text_get_byte: (x) => method(x[0], "sub", add1(x[1]), add1(x[1])),
        text_get_byte_slice: (x) => method(x[0], "sub", x[1], add1(x[2])),
      }),
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
      mapOps({
        text_to_int: (x) =>
          op("mul", int(1n), implicitConversion("text_to_int", x[0])),
        argv_get: (x) =>
          op("list_get", { ...builtin("arg"), type: textType() }, x[0]),
        text_get_byte_to_int: (x) => method(x[0], "byte", add1(x[1])),
        text_get_byte: (x) => method(x[0], "sub", add1(x[1]), add1(x[1])),
        text_get_byte_slice: (x) => method(x[0], "sub", x[1], add1(x[2])),
      }),
      conditionalOpToAndOr(
        (n, s) => !["boolean", "void"].includes(getType(n, s).kind),
        "list",
      ),
      useIndexCalls(true),
      mapOps({
        int_to_text: (x) =>
          op("concat", text(""), implicitConversion("int_to_text", x[0])),
        join: (x) => func("table.concat", isText("")(x[1]) ? [x[0]] : x),
        text_byte_length: (x) => method(x[0], "len"),
        true: builtin("true"),
        false: builtin("false"),
        repeat: (x) => method(x[0], "rep", x[1]),
        argv: builtin("arg"),
        int_to_text_byte: (x) => func("string.char", x),

        text_replace: ([a, b, c]) =>
          method(
            a,
            "gsub",
            isText()(b)
              ? text(
                  b.value.replace(
                    /(-|%|\^|\$|\(|\)|\.|\[|\]|\*|\+|\?)/g,
                    "%$1",
                  ),
                )
              : method(b, "gsub", text("(%W)"), text("%%%1")),
            isText()(c)
              ? text(c.value.replace("%", "%%"))
              : method(c, "gsub", text("%%"), text("%%%%")),
          ),
      }),
      mapTo(func)({
        read_line: "io.read",
        print: "io.write",
        println: "print",
        min: "math.min",
        max: "math.max",
        abs: "math.abs",
      }),
    ),

    simplegolf(base10DecompositionToFloatLiteralAsBuiltin),
    required(
      mapToPrefixAndInfix({
        pow: "^",
        not: "not",
        neg: "-",
        list_length: "#",
        bit_not: "~",
        mul: "*",
        div: "//",
        mod: "%",
        add: "+",
        sub: "-",
        concat: "..",
        bit_shift_left: "<<",
        bit_shift_right: ">>",
        bit_and: "&",
        bit_xor: "~",
        bit_or: "|",
        lt: "<",
        leq: "<=",
        eq: "==",
        neq: "~=",
        geq: ">=",
        gt: ">",
        and: "and",
        or: "or",
      }),
    ),
    simplegolf(
      alias({
        Integer: (x) => x.value.toString(),
        Text: (x) => `"${x.value}"`,
      }),
    ),
    required(renameIdents(), assertInt64, removeImplicitConversions),
  ],
};

export default luaLanguage;
