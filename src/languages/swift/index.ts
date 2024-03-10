import {
  functionCall as func,
  indexCall,
  methodCall as method,
  op,
  text,
  succ,
  propertyCall as prop,
  isText,
  builtin,
  int,
  postfix,
  isInt,
  list,
  conditional,
  rangeIndexCall,
  intToDecOpOrText,
  infix,
} from "../../IR";
import {
  type Language,
  required,
  search,
  simplegolf,
} from "../../common/Language";

import {
  flipBinaryOps,
  removeImplicitConversions,
  printIntToPrint,
  arraysToLists,
  mapOps,
  mapOpsTo,
  mapBackwardsIndexToForwards,
  mapMutationTo,
} from "../../plugins/ops";
import { alias, renameIdents } from "../../plugins/idents";
import { golfStringListLiteral, listOpsToTextOps } from "../../plugins/static";
import {
  golfLastPrint,
  implicitlyConvertPrintArg,
  putcToPrintChar,
  mergePrint,
} from "../../plugins/print";
import { assertInt64 } from "../../plugins/types";
import {
  addVarDeclarations,
  groupVarDeclarations,
  inlineVariables,
  noStandaloneVarDeclarations,
} from "../../plugins/block";
import {
  forArgvToForEach,
  rangeExclusiveToInclusive,
  forRangeToForRangeOneStep,
  useImplicitForEachChar,
} from "../../plugins/loops";
import {
  usePrimaryTextOps,
  replaceToSplitAndJoin,
  ordToDecToInt,
  charToIntToDec,
} from "../../plugins/textOps";
import { addImports } from "../../plugins/imports";
import {
  applyDeMorgans,
  equalityToInequality,
  truncatingOpsPlugins,
  bitnotPlugins,
  lowBitsPlugins,
  decomposeIntLiteral,
  pickAnyInt,
  comparisonToDivision,
} from "../../plugins/arithmetic";
import { SwiftEmitter } from "./emit";

const swiftLanguage: Language = {
  name: "Swift",
  extension: "swift",
  emitter: new SwiftEmitter(),
  phases: [
    required(printIntToPrint, arraysToLists, usePrimaryTextOps("codepoint")),
    simplegolf(
      golfLastPrint(),
      comparisonToDivision,
      charToIntToDec,
      ordToDecToInt,
    ),
    search(
      mergePrint,
      flipBinaryOps,
      golfStringListLiteral(false),
      listOpsToTextOps(),
      equalityToInequality,
      rangeExclusiveToInclusive(),
      ...bitnotPlugins,
      ...lowBitsPlugins,
      applyDeMorgans,
      forRangeToForRangeOneStep,
      inlineVariables,
      replaceToSplitAndJoin,
      forArgvToForEach,
      ...truncatingOpsPlugins,
      mapOps({
        argv: () => builtin("CommandLine.arguments[1...]"),
        "at[argv]": (a) =>
          op["at[List]"](builtin("CommandLine.arguments"), succ(a)),
        "ord[codepoint]": (a) => op["ord_at[codepoint]"](a, int(0n)),
        "ord[byte]": (a) => op["ord_at[byte]"](a, int(0n)),
        "at[byte]": (a, b) => op["char[byte]"](op["ord_at[byte]"](a, b)),
      }),

      decomposeIntLiteral(),
    ),
    required(
      mapBackwardsIndexToForwards({
        "at_back[Ascii]": "size[Ascii]",
        "at_back[byte]": "size[byte]",
        "at_back[codepoint]": "size[codepoint]",
        "at_back[List]": "size[List]",
        "slice_back[Ascii]": "size[Ascii]",
        "slice_back[byte]": "size[byte]",
        "slice_back[codepoint]": "size[codepoint]",
        "slice_back[List]": "size[List]",
        "with_at_back[List]": "size[List]",
      }),
      putcToPrintChar,
      pickAnyInt,
      forArgvToForEach,
      ...truncatingOpsPlugins,
      mapOps({
        "read[line]": () => func("readLine"),
        argv: () => builtin("CommandLine.arguments[1...]"),
        "at[argv]": (a) =>
          op["at[List]"](builtin("CommandLine.arguments"), succ(a)),
        "ord[codepoint]": (a) => op["ord_at[codepoint]"](a, int(0n)),
        "ord[byte]": (a) => op["ord_at[byte]"](a, int(0n)),
        "at[byte]": (a, b) => op["char[byte]"](op["ord_at[byte]"](a, b)),
      }),
      implicitlyConvertPrintArg,
      mapOps({
        join: (a, b) =>
          method(a, "joined", isText("")(b) ? [] : { separator: b }),
        "ord_at[byte]": (a, b) =>
          func("Int", indexCall(func("Array", prop(a, "utf8")), b)),
        "at[codepoint]": (a, b) =>
          func("String", indexCall(func("Array", a), b)),
        "slice[codepoint]": (a, b, c) =>
          isInt(0n)(b)
            ? method(a, "prefix", c)
            : method(method(a, "prefix", op.add(b, c)), "suffix", c),
        "slice[List]": (a, b, c) => rangeIndexCall(a, b, op.add(b, c), int(1n)),
        "ord_at[codepoint]": (a, b) =>
          prop(indexCall(func("Array", prop(a, "unicodeScalars")), b), "value"),
        "char[byte]": (a) =>
          func("String", postfix("!", func("UnicodeScalar", a))),
        "char[codepoint]": (a) =>
          func("String", postfix("!", func("UnicodeScalar", a))),
        "size[codepoint]": (a) => prop(a, "count"),
        "size[byte]": (a) => prop(prop(a, "utf8"), "count"),
        "size[List]": (a) => prop(a, "count"),
        "size[Set]": (a) => prop(a, "count"),
        "size[Table]": (a) => prop(a, "count"),
        "reversed[codepoint]": (a) => func("String", method(a, "reversed")),
        "reversed[List]": (a) => func("Array", method(a, "reversed")),
        "sorted[Int]": (a) => method(a, "sorted"),
        "sorted[Ascii]": (a) => method(a, "sorted"),
        int_to_dec: (x) => func("String", x),
        split: (a, b) =>
          method(a, "split", {
            separator: b,
            omittingEmptySubsequences: op.false,
          }),
        repeat: (a, b) => func("String", { repeating: a, count: b }),
        "contains[Text]": (a, b) => method(a, "contains", b),
        "contains[List]": (a, b) => method(a, "contains", b),
        "contains[Set]": (a, b) => method(a, "contains", b),
        "contains[Table]": (a, b) => method(prop(a, "keys"), "contains", b),
        "find[List]": (a, b) => method(a, "index", { of: b }),
        "find[codepoint]": (a, b) =>
          conditional(
            op["contains[Text]"](a, b),
            op["size[codepoint]"](op["at[List]"](op.split(a, b), int(0n))),
            int(-1n),
          ),
        "find[byte]": (a, b) =>
          conditional(
            op["contains[Text]"](a, b),
            op["size[byte]"](op["at[List]"](op.split(a, b), int(0n))),
            int(-1n),
          ),
        pow: (a, b) =>
          func("Int", func("pow", func("Double", a), func("Double", b))),
        "println[Text]": (a) => func("print", a),
        "print[Text]": (a) => func("print", a, { terminator: text("") }),
        dec_to_int: (a) => postfix("!", func("Int", a)),
        append: (a, b) => op["concat[List]"](a, list([b])),
        include: (a, b) => method(a, "insert", b),
        bool_to_int: (a) => conditional(a, int(1n), int(0n)),
        int_to_bool: (a) => op["neq[Int]"](a, int(0n)),
        int_to_hex: (a) =>
          func("String", a, { radix: int(16n), uppercase: op.false }),
        int_to_Hex: (a) =>
          func("String", a, { radix: int(16n), uppercase: op.true }),
        int_to_bin: (a) => func("String", a, { radix: int(2n) }),
        int_to_hex_aligned: (a, b) =>
          func(
            "String",
            {
              format: op["concat[Text]"](
                text("%0"),
                intToDecOpOrText(b),
                text("x"),
              ),
            },
            a,
          ),
        int_to_Hex_aligned: (a, b) =>
          func(
            "String",
            {
              format: op["concat[Text]"](
                text("%0"),
                intToDecOpOrText(b),
                text("X"),
              ),
            },
            a,
          ),
        int_to_bin_aligned: (a, b) =>
          method(
            op["concat[Text]"](op.repeat(text("0"), b), op.int_to_bin(a)),
            "suffix",
            b,
          ),
        right_align: (a, b) =>
          method(op["concat[Text]"](op.repeat(text(" "), b), a), "suffix", b),

        replace: (a, b, c) =>
          method(a, "replacingOccurrences", { of: b, with: c }),
        starts_with: (a, b) => method(a, "hasPrefix", b),
        ends_with: (a, b) => method(a, "hasSuffix", b),
        bit_count: (a) =>
          prop(
            method(op.int_to_bin(a), "filter", builtin(`{$0>"0"}`)),
            "count",
          ),
        range_excl: (a, b, c) =>
          isInt(1n)(c)
            ? infix("..<", a, b)
            : func("stride", { from: a, to: b, by: c }),
        range_incl: (a, b, c) =>
          isInt(1n)(c)
            ? infix("...", a, b)
            : func("stride", { from: a, to: succ(b), by: c }),
      }),
      mapOpsTo.func({
        max: "max",
        min: "min",
        abs: "abs",
      }),
      mapOpsTo.builtin({ true: "true", false: "false" }),
      mapMutationTo.method({
        append: "append",
      }),
      mapMutationTo.infix({
        add: "+=",
        sub: "-=",
        mul: "*=",
        trunc_div: "/=",
        rem: "%=",
        bit_and: "&=",
        bit_or: "|=",
        bit_xor: "^=",
        bit_shift_left: "<<=",
        bit_shift_right: ">>=",
      }),
      mapOpsTo.infix({
        bit_shift_left: "<<",
        bit_shift_right: ">>",
        trunc_div: "/",
        rem: "%",
        bit_and: "&",
        add: "+",
        binarySub: "-",
        bit_or: "|",
        bit_xor: "^",
        "concat[Text]": "+",
        "concat[List]": "+",
        lt: "<",
        leq: "<=",
        "eq[Int]": "==",
        "eq[Text]": "==",
        "neq[Int]": "!=",
        "neq[Text]": "!=",
        geq: ">=",
        gt: ">",
        and: "&&",
        or: "||",
      }),
      mapOpsTo.prefix({
        not: "!",
        neg: "-",
        bit_not: "~",
      }),
      mapOpsTo.infix({ mul: "*" }),
      mapMutationTo.index({
        "with_at[Array]": 0,
        "with_at[List]": 0,
        "with_at[Table]": 0,
      }),
      mapOpsTo.index({
        "at[Array]": 0,
        "at[List]": 0,
        "at[Table]": 0,
      }),
      addImports({ Foundation: ["pow", "replacingOccurrences", "format"] }),
      useImplicitForEachChar("codepoint"),
    ),
    simplegolf(
      alias({
        Integer: (x) => x.value.toString(),
        Text: (x) => `"${x.value}"`,
      }),
    ),
    required(
      renameIdents(),
      addVarDeclarations,
      groupVarDeclarations(),
      noStandaloneVarDeclarations,
      assertInt64,
      removeImplicitConversions,
    ),
  ],
};

export default swiftLanguage;
