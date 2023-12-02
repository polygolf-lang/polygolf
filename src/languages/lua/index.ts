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
import {
  golfLastPrint,
  implicitlyConvertPrintArg,
  putcToPrintChar,
  mergePrint,
} from "../../plugins/print";
import {
  textToIntToFirstIndexTextGetToInt,
  usePrimaryTextOps,
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
    required(printIntToPrint, putcToPrintChar),
    simplegolf(golfLastPrint()),
    search(
      mergePrint,
      flipBinaryOps,
      listOpsToTextOps("find[byte]", "at[byte]"),
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
      textToIntToFirstIndexTextGetToInt,
      mapOps({
        dec_to_int: (x) =>
          op("add", int(0n), implicitConversion("dec_to_int", x[0])),
        "at[argv]": (x) =>
          op("at[List]", { ...builtin("arg"), type: textType() }, x[0]),

        "ord_at[byte]": (x) => method(x[0], "byte", add1(x[1])),
        "at[byte]": (x) => method(x[0], "sub", add1(x[1]), add1(x[1])),
        "slice[byte]": (x) =>
          method(x[0], "sub", add1(x[1]), op("add", x[1], x[2])),
      }),
      useIndexCalls(true),
      decomposeIntLiteral(true, true, true),
    ),
    required(
      pickAnyInt,
      forArgvToForRange(),
      forRangeToForRangeInclusive(),
      implicitlyConvertPrintArg,
      usePrimaryTextOps("byte"),
      textToIntToFirstIndexTextGetToInt,
      mapOps({
        dec_to_int: (x) =>
          op("mul", int(1n), implicitConversion("dec_to_int", x[0])),
        "at[argv]": (x) =>
          op("at[List]", { ...builtin("arg"), type: textType() }, x[0]),
        "ord_at[byte]": (x) => method(x[0], "byte", add1(x[1])),
        "at[byte]": (x) => method(x[0], "sub", add1(x[1]), add1(x[1])),
        "slice[byte]": (x) =>
          method(x[0], "sub", add1(x[1]), op("add", x[1], x[2])),
      }),
      conditionalOpToAndOr(
        (n, s) => !["boolean", "void"].includes(getType(n, s).kind),
        "List",
      ),
      useIndexCalls(true),
      mapOps({
        int_to_dec: (x) =>
          op("concat[Text]", text(""), implicitConversion("int_to_dec", x[0])),
        join: (x) => func("table.concat", isText("")(x[1]) ? [x[0]] : x),
        "size[byte]": (x) => method(x[0], "len"),
        true: builtin("true"),
        false: builtin("false"),
        repeat: (x) => method(x[0], "rep", x[1]),
        argv: builtin("arg"),
        "char[byte]": (x) => func("string.char", x),

        replace: ([a, b, c]) =>
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
        "read[line]": "io.read",
        "print[Text]": "io.write",
        "println[Text]": "print",
        "reversed[byte]": "string.reverse",
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
        "size[List]": "#",
        "size[Table]": "#",
        "size[byte]": "#",
        bit_not: "~",
        mul: "*",
        div: "//",
        mod: "%",
        add: "+",
        sub: "-",
        "concat[Text]": "..",
        bit_shift_left: "<<",
        bit_shift_right: ">>",
        bit_and: "&",
        bit_xor: "~",
        bit_or: "|",
        lt: "<",
        leq: "<=",
        "eq[Int]": "==",
        "eq[Text]": "==",
        "neq[Int]": "~=",
        "neq[Text]": "~=",
        geq: ">=",
        gt: ">",
        and: "and",
        or: "or",
      }),
    ),
    simplegolf(
      alias({
        Identifier: (n, s) =>
          n.builtin &&
          (s.parent?.node.kind !== "MethodCall" || s.pathFragment !== "ident")
            ? n.name
            : undefined,
        Integer: (x) => x.value.toString(),
        Text: (x) => `"${x.value}"`,
      }),
    ),
    required(renameIdents(), assertInt64, removeImplicitConversions),
  ],
};

export default luaLanguage;
