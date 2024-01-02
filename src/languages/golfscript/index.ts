import {
  assignment,
  integerType,
  isSubtype,
  rangeIndexCall,
  builtin,
  op,
  int,
  text,
  list,
  isInt,
  implicitConversion,
  functionCall as func,
  pred,
  succ,
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
  arraysToLists,
  mapBackwardsIndexToForwards,
  mapOps,
  mapOpsTo,
  mapMutationTo,
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
  startsWithEndsWithToSliceEquality,
} from "../../plugins/textOps";
import { inlineVariables } from "../../plugins/block";

const golfscriptLanguage: Language = {
  name: "Golfscript",
  extension: "gs",
  emitter: emitProgram,
  phases: [
    required(printIntToPrint, arraysToLists, usePrimaryTextOps("byte")),
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
      startsWithEndsWithToSliceEquality("byte"),
      printConcatToMultiPrint,
      useBuiltinAliases({ "\n": "n" }),
      alias({
        Integer: (x) => x.value.toString(),
        Text: (x) => `"${x.value}"`,
      }),
    ),
    required(
      mapOps({
        "at[argv]": (a) => op["at[List]"](op.argv, a),
        "slice[byte]": (a, b, c) => rangeIndexCall(a, b, op.add(b, c), int(1)),
        "slice[List]": (a, b, c) => rangeIndexCall(a, b, op.add(b, c), int(1)),
        max: (...x) => op["at[List]"](op["sorted[Int]"](list(x)), int(1)),
        min: (...x) => op["at[List]"](op["sorted[Int]"](list(x)), int(0)),

        leq: (a, b) => (isInt()(a) ? op.lt(pred(a), b) : op.lt(a, succ(b))),

        geq: (a, b) => (isInt()(a) ? op.gt(succ(a), b) : op.gt(a, pred(b))),
        int_to_bool: (a) => implicitConversion("int_to_bool", a),
        bool_to_int: (a) => implicitConversion("bool_to_int", a),
        append: (a, b) => op["concat[List]"](a, list([b])),
        "contains[Text]": (a, b) =>
          implicitConversion(
            "int_to_bool",
            op.add(op["find[byte]"](a, b), int(1n)),
          ),
        "contains[List]": (a, b) =>
          implicitConversion(
            "int_to_bool",
            op.add(op["find[List]"](a, b), int(1n)),
          ),
        int_to_bin: (a) => func("*", func("base", a, int(2n)), text("")),

        // TO-DO: less hacky implementations for these:
        int_to_hex: (a) =>
          func("+", func("{.9>39*+48+}%", func("base", a, int(16n))), text("")),
        int_to_Hex: (a) =>
          func("+", func("{.9>7*+48+}%", func("base", a, int(16n))), text("")),
        gcd: (a, b) => func("{.}{.@@%}while;", a, b),
        split_whitespace: (a) =>
          op.split(func("{...9<\\13>+*\\32if}%", a), text(" ")),
        right_align: (a, b) => func('1$,-.0>*" "*\\+', a, b),
        int_to_hex_aligned: (a, b) =>
          func('16base{.9>39*+48+}%""+\\1$,-.0>*"0"*\\+', a, b),
        int_to_Hex_aligned: (a, b) =>
          func('16base{.9>7*+48+}%""+\\1$,-.0>*"0"*\\+', a, b),
        int_to_bin_aligned: (a, b) => func('2base""+\\1$,-.0>*"0"*\\+', a, b),
        bit_count: (a) => func("2base 0+{+}*", a),
      }),
      mapOpsTo.builtin({ argv: "a", true: "1", false: "0" }),
      mapBackwardsIndexToForwards({
        "at_back[Ascii]": 0,
        "at_back[byte]": 0,
        "at_back[codepoint]": 0,
        "at_back[List]": 0,
        "slice_back[Ascii]": 0,
        "slice_back[byte]": 0,
        "slice_back[codepoint]": 0,
        "slice_back[List]": 0,
        "with_at_back[List]": 0,
      }),
      textGetToTextGetToIntToText,
      mapMutationTo.index({
        "with_at[Array]": 0,
        "with_at[List]": 0,
        "with_at_back[List]": 0,
        "with_at[Table]": 0,
      }),
      mapOpsTo.index({
        "at[Array]": 0,
        "at[List]": 0,
        "at_back[List]": 0,
        "at[Table]": 0,
      }),
      mapOpsTo.func(
        {
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
        },
        "leftChain",
      ),
      mapOps({
        "neq[Int]": (a, b) => func("!", func("=", a, b)),
        "neq[Text]": (a, b) => func("!", func("=", a, b)),
        "reversed[byte]": (a) => func("%", a, int(-1)),
        "reversed[List]": (a) => func("%", a, int(-1)),
        "char[byte]": (...x) => func("+", list(x), text("")),
      }),
    ),
    required(
      printToImplicitOutput,
      addImports({ a: ["a"] }, (x) =>
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
