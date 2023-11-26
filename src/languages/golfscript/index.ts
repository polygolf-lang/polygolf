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
  infix,
  list,
  prefix,
  isIntLiteral,
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
  mapOps,
  mapToPrefixAndInfix,
  flipBinaryOps,
  removeImplicitConversions,
  printIntToPrint,
} from "../../plugins/ops";
import { alias, renameIdents, useBuiltinAliases } from "../../plugins/idents";
import {
  golfLastPrint,
  implicitlyConvertPrintArg,
  printConcatToMultiPrint,
  printLnToPrint,
  printToImplicitOutput,
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
    required(printIntToPrint),
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
    ),
    required(
      pickAnyInt,
      forArgvToForEach,
      bitShiftToMulOrDiv(false, true, true),
      usePrimaryTextOps("byte"),
      textGetToTextGetToIntToText,
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
        neg: (x) => op("mul", x[0], int(-1)),
        max: (x) => op("at[List]", op("sorted[Int]", list(x)), int(1)),
        min: (x) => op("at[List]", op("sorted[Int]", list(x)), int(0)),

        leq: (x) =>
          op(
            "lt",
            ...(isIntLiteral()(x[0]) ? [sub1(x[0]), x[1]] : [x[0], add1(x[1])]),
          ),

        geq: (x) =>
          op(
            "gt",
            ...(isIntLiteral()(x[0]) ? [add1(x[0]), x[1]] : [x[0], sub1(x[1])]),
          ),
      }),
      mapToPrefixAndInfix({
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
        lt: "<",
        "eq[Int]": "=",
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
        push: "+",
        "at[List]": "=",
        "size[List]": ",",
        join: "*",
        "sorted[Int]": "$",
        "sorted[Ascii]": "$",
      }),
      mapOps({
        "neq[Int]": (x) => prefix("!", infix("=", x[0], x[1])),
        "reversed[byte]": (x) => infix("%", x[0], int(-1)),
        "char[byte]": (x) => infix("+", list(x), text("")),
      }),
    ),
    required(
      printToImplicitOutput,
      addImports({ a: "a" }, (x) =>
        x.length > 0 ? assignment("a", builtin("")) : undefined,
      ),
      renameIdents({
        // Custom Ident generator prevents `n` from being used as an ident, as it is predefined to newline and breaks printing if modified
        preferred(original: string) {
          const firstLetter = [...original].find((x) => /[A-Za-z]/.test(x));
          if (firstLetter === undefined) return [];
          if (/n/i.test(firstLetter)) return ["N", "m", "M"];
          const lower = firstLetter.toLowerCase();
          const upper = firstLetter.toUpperCase();
          return [firstLetter, firstLetter === lower ? upper : lower];
        },
        short: "abcdefghijklmopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
        general: (i) => `v${i}`,
      }),
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
