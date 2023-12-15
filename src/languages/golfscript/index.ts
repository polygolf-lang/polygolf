import {
  assignment,
  integerType,
  isSubtype,
  rangeIndexCall,
  add1,
  sub1,
  builtin,
  op,
  int,
  text,
  list,
  isInt,
  implicitConversion,
  functionCall as func,
} from "../../IR";
import {
  defaultDetokenizer,
  type Language,
  required,
  search,
  simplegolf,
} from "../../common/Language";
import emitProgram from "./emit";
import {
  flipBinaryOps,
  removeImplicitConversions,
  printIntToPrint,
  useIndexCalls,
  arraysToLists,
  backwardsIndexToForwards,
  mapOps,
  mapOpsToFunc,
} from "../../plugins/ops";
import {
  alias,
  defaultIdentGen,
  renameIdents,
  useBuiltinAliases,
} from "../../plugins/idents";
import {
  golfLastPrint,
  implicitlyConvertPrintArg,
  printConcatToMultiPrint,
  printLnToPrint,
  printToImplicitOutput,
  putcToPrintChar,
  splitPrint,
} from "../../plugins/print";
import {
  forArgvToForEach,
  forRangeToForDifferenceRange,
  forRangeToForRangeOneStep,
  removeUnusedForVar,
} from "../../plugins/loops";
import { addImports } from "../../plugins/imports";
import { getType } from "../../common/getType";
import {
  bitnotPlugins,
  applyDeMorgans,
  equalityToInequality,
  bitShiftToMulOrDiv,
  powPlugins,
  lowBitsPlugins,
  decomposeIntLiteral,
  pickAnyInt,
} from "../../plugins/arithmetic";
import {
  usePrimaryTextOps,
  textGetToTextGetToIntToText,
  replaceToSplitAndJoin,
} from "../../plugins/textOps";
import { inlineVariables } from "../../plugins/block";
import { hardcode } from "../../plugins/static";

const golfscriptLanguage: Language = {
  name: "Golfscript",
  extension: "gs",
  emitter: emitProgram,
  phases: [
    search(hardcode()),
    required(printIntToPrint, arraysToLists),
    simplegolf(golfLastPrint(false)),
    search(
      flipBinaryOps,
      equalityToInequality,
      ...bitnotPlugins,
      ...powPlugins,
      ...lowBitsPlugins,
      applyDeMorgans,
      forRangeToForRangeOneStep,
      inlineVariables,
      forArgvToForEach,
      bitShiftToMulOrDiv(false, true, true),
      decomposeIntLiteral(false, true, false),
      splitPrint,
    ),
    required(
      pickAnyInt,
      forArgvToForEach,
      putcToPrintChar,
      bitShiftToMulOrDiv(false, true, true),
      usePrimaryTextOps("byte"),
      removeUnusedForVar,
      forRangeToForDifferenceRange(
        (node, spine) =>
          !isSubtype(getType(node.start, spine.root.node), integerType(0)),
      ),
      replaceToSplitAndJoin,
      implicitlyConvertPrintArg,
      printLnToPrint,
    ),
    simplegolf(
      printConcatToMultiPrint,
      useBuiltinAliases({ "\n": "n" }),
      alias({
        Integer: (x) => x.value.toString(),
        Text: (x) => `"${x.value}"`,
      }),
    ),
    required(
      mapOps({
        "at[argv]": (x) => op("at[List]", op("argv"), x[0]),
        argv: builtin("a"),
        true: int(1),
        false: int(0),

        "slice[byte]": (x) =>
          rangeIndexCall(x[0], x[1], op("add", x[1], x[2]), int(1)),
        "slice[List]": (x) =>
          rangeIndexCall(x[0], x[1], op("add", x[1], x[2]), int(1)),
        neg: (x) => op("mul", x[0], int(-1)),
        max: (x) => op("at[List]", op("sorted[Int]", list(x)), int(1)),
        min: (x) => op("at[List]", op("sorted[Int]", list(x)), int(0)),

        leq: (x) =>
          op(
            "lt",
            ...(isInt()(x[0]) ? [sub1(x[0]), x[1]] : [x[0], add1(x[1])]),
          ),

        geq: (x) =>
          op(
            "gt",
            ...(isInt()(x[0]) ? [add1(x[0]), x[1]] : [x[0], sub1(x[1])]),
          ),
        int_to_bool: (x) => implicitConversion("int_to_bool", x[0]),
        bool_to_int: (x) => implicitConversion("bool_to_int", x[0]),
        append: (x) => op("concat[List]", x[0], list([x[1]])),
        "contains[Text]": (x) =>
          implicitConversion(
            "int_to_bool",
            op("add", op("find[byte]", x[0], x[1]), int(1n)),
          ),
        "contains[List]": (x) =>
          implicitConversion(
            "int_to_bool",
            op("add", op("find[List]", x[0], x[1]), int(1n)),
          ),
        int_to_bin: (x) => func("*", func("base", x[0], int(2n)), text("")),

        // TO-DO: less hacky implementations for these:
        int_to_hex: (x) =>
          func(
            "+",
            func("{.9>7*+48+}%", func("base", x[0], int(16n))),
            text(""),
          ),
        gcd: (x) => func("{.}{.@@%}while;", x[0], x[1]),
        split_whitespace: (x) =>
          op("split", func("{...9<\\13>+*\\32if}%", x[0]), text(" ")),
        right_align: (x) => func('1$,-.0>*" "*\\+', x[0], x[1]),
        int_to_hex_aligned: (x) =>
          func('16base{.9>7*+48+}%""+\\1$,-.0>*"0"*\\+', x[0], x[1]),
        int_to_bin_aligned: (x) =>
          func('2base""+\\1$,-.0>*"0"*\\+', x[0], x[1]),
      }),
      backwardsIndexToForwards(false),
      textGetToTextGetToIntToText,
      useIndexCalls(false),
      mapOpsToFunc({
        not: "!",
        bit_not: "~",
        mul: "*",
        div: "/",
        trunc_div: "/",
        mod: "%",
        bit_and: "&",
        add: "+",
        sub: "-",
        bit_or: "|",
        bit_xor: "^",
        "concat[Text]": "+",
        "concat[List]": "+",
        lt: "<",
        "eq[Int]": "=",
        "eq[Text]": "=",
        gt: ">",
        and: "and",
        or: "or",
        "ord_at[byte]": "=",
        "size[byte]": ",",
        "ord[byte]": ")",
        int_to_dec: "`",
        split: "/",
        repeat: "*",
        pow: "?",
        dec_to_int: "~",
        abs: "abs",
        "size[List]": ",",
        join: "*",
        "sorted[Int]": "$",
        "sorted[Ascii]": "$",
        "find[byte]": "?",
        "find[List]": "?",
      }),
      mapOps({
        "neq[Int]": (x) => func("!", func("=", x[0], x[1])),
        "neq[Text]": (x) => func("!", func("=", x[0], x[1])),
        "reversed[byte]": (x) => func("%", x[0], int(-1)),
        "reversed[List]": (x) => func("%", x[0], int(-1)),
        "char[byte]": (x) => func("+", list(x), text("")),
      }),
    ),
    required(
      printToImplicitOutput,
      addImports({ a: "a" }, (x) =>
        x.length > 0 ? assignment(builtin("a"), builtin("")) : undefined,
      ),
      renameIdents(defaultIdentGen("a", "n")),
      removeImplicitConversions,
    ),
  ],
  detokenizer: defaultDetokenizer(
    (a, b) =>
      a !== "" &&
      b !== "" &&
      ((/[A-Za-z0-9_]/.test(a[a.length - 1]) && /[A-Za-z0-9_]/.test(b[0])) ||
        (a[a.length - 1] === "-" && /[0-9]/.test(b[0]))),
  ),
};

export default golfscriptLanguage;
