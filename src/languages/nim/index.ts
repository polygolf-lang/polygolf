import {
  functionCall as func,
  indexCall,
  int,
  rangeIndexCall,
  succ,
  array,
  builtin,
  op,
  prefix,
  text,
  type Text,
  isInt,
  infix,
} from "../../IR";
import {
  type Language,
  required,
  search,
  simplegolf,
} from "../../common/Language";

import { NimEmitter } from "./emit";
import {
  flipBinaryOps,
  removeImplicitConversions,
  printIntToPrint,
  mapOps,
  mapOpsTo,
  mapBackwardsIndexToForwards,
  mapMutationTo,
  flipped,
  withDefaults,
} from "../../plugins/ops";
import {
  addNimImports,
  getEndIndex,
  removeSystemNamespace,
  removeToSeqFromFor,
  useBackwardsIndex,
  useRawStringLiteral,
  useUFCS,
  useUnsignedDivision,
} from "./plugins";
import { alias, renameIdents } from "../../plugins/idents";
import {
  forArgvToForEach,
  forArgvToForRange,
  forRangeToForEach,
  rangeExclusiveToInclusive,
  forRangeToForRangeOneStep,
  removeUnusedLoopVar,
  shiftRangeOneUp,
  useImplicitForEachChar,
} from "../../plugins/loops";
import { golfStringListLiteral, listOpsToTextOps } from "../../plugins/static";
import {
  golfLastPrint,
  implicitlyConvertPrintArg,
  putcToPrintChar,
  mergePrint,
} from "../../plugins/print";
import {
  useDecimalConstantPackedPrinter,
  useLowDecimalListPackedPrinter,
} from "../../plugins/packing";
import { tableHashing, tableToListLookup } from "../../plugins/tables";
import hash from "./hash";
import {
  textToIntToTextGetToInt,
  textToIntToFirstIndexTextGetToInt,
  usePrimaryTextOps,
  useMultireplace,
  startsWithEndsWithToSliceEquality,
  charToIntToDec,
  ordToDecToInt,
  decToIntToOrd,
  atTextToListToAtText,
} from "../../plugins/textOps";
import { assertInt64 } from "../../plugins/types";
import {
  addManyToManyAssignments,
  addVarDeclarationManyToManyAssignments,
  addVarDeclarationOneToManyAssignments,
  addVarDeclarations,
  groupVarDeclarations,
  inlineVariables,
  noStandaloneVarDeclarations,
  tempVarToMultipleAssignment,
} from "../../plugins/block";
import {
  applyDeMorgans,
  equalityToInequality,
  truncatingOpsPlugins,
  bitnotPlugins,
  decomposeIntLiteral,
  pickAnyInt,
  lowBitsPlugins,
  comparisonToDivision,
} from "../../plugins/arithmetic";
import { safeConditionalOpToAt } from "../../plugins/conditions";

const c48: Text = { ...text("0"), targetType: "char" };

const nimLanguage: Language = {
  name: "Nim",
  extension: "nim",
  emitter: new NimEmitter(),
  phases: [
    required(printIntToPrint, putcToPrintChar, usePrimaryTextOps("byte")),
    simplegolf(golfLastPrint(), charToIntToDec),
    search(
      mergePrint,
      flipBinaryOps,
      golfStringListLiteral(),
      listOpsToTextOps("find[byte]", "at[byte]"),
      forRangeToForEach("at[Array]", "at[List]", "at[byte]"),
      tempVarToMultipleAssignment,
      useDecimalConstantPackedPrinter,
      useLowDecimalListPackedPrinter,
      tableHashing(hash),
      tableToListLookup,
      equalityToInequality,
      shiftRangeOneUp,
      rangeExclusiveToInclusive(),
      ...bitnotPlugins,
      ...lowBitsPlugins,
      applyDeMorgans,
      textToIntToTextGetToInt,
      forRangeToForRangeOneStep,
      useMultireplace(),
      inlineVariables,
      forArgvToForEach,
      forArgvToForRange(true),
      ...truncatingOpsPlugins,
      decomposeIntLiteral(),
      startsWithEndsWithToSliceEquality("byte"),
      ordToDecToInt,
      decToIntToOrd,
      comparisonToDivision,
    ),
    simplegolf(safeConditionalOpToAt("Array")),
    required(
      atTextToListToAtText,
      pickAnyInt,
      forArgvToForEach,
      ...truncatingOpsPlugins,
      mapOps({
        "at[argv]": (a) => func("paramStr", succ(a)),
      }),
      removeUnusedLoopVar,
      rangeExclusiveToInclusive(true),
      implicitlyConvertPrintArg,
      textToIntToFirstIndexTextGetToInt,
      useUnsignedDivision,
      useBackwardsIndex,
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
      mapOps({
        "reversed[codepoint]": (a) =>
          op.join(func("reversed", func("toRunes", a)), text("")),
        "reversed[byte]": (a) => op.join(func("reversed", a), text("")),
      }),
      mapOps({
        "char[codepoint]": (x) => prefix("$", func("Rune", x)),
        "ord_at[byte]": (a, b) => func("ord", op["at[byte]"](a, b)),
        "ord_at[codepoint]": (a, b) => func("ord", op["at[codepoint]"](a, b)),
        "read[line]": () => func("readLine", builtin("stdin")),
        "at[byte]": (a, b) => indexCall(a, b),
        "at[codepoint]": (a, b) =>
          prefix("$", indexCall(func("toRunes", a), b)),
        "slice[byte]": (a, b, c) =>
          rangeIndexCall(a, b, getEndIndex(b, c), int(1n)),
        "slice[List]": (a, b, c) =>
          rangeIndexCall(a, b, getEndIndex(b, c), int(1n)),
        "print[Text]": (a) => func("write", builtin("stdout"), a),
        text_multireplace: (a, ...x) =>
          func(
            "multireplace",
            a,
            array(
              x.flatMap((_, i) =>
                i % 2 === 0 ? [array(x.slice(i, i + 2))] : [],
              ), // Polygolf doesn't have array of tuples, so we use array of arrays instead
            ),
          ),
        "size[codepoint]": (a) => op["size[List]"](func("toRunes", a)),
        int_to_bool: (a) => op["eq[Int]"](a, int(0n)),
        int_to_bin_aligned: (a, b) => func("align", op.int_to_bin(a), b, c48),
        int_to_hex_aligned: (a, b) => func("align", op.int_to_hex(a), b, c48),
        int_to_Hex_aligned: (a, b) => func("align", op.int_to_Hex(a), b, c48),
        range_excl: (a, b, c) =>
          func(
            "toSeq",
            isInt(1n)(c) ? infix("..<", a, b) : func("countup", a, b, c),
          ),
        range_incl: (a, b, c) =>
          func(
            "toSeq",
            isInt(1n)(c)
              ? isInt(0n)(a)
                ? prefix("..", b)
                : infix("..", a, b)
              : func("countup", a, succ(b), c),
          ),
      }),
      mapOpsTo.builtin({ true: "true", false: "false" }),
      mapOps({
        int_to_hex: (a) => func("toLowerAscii", op.int_to_Hex(a)),
      }),
      mapOpsTo.func(
        {
          argv: "commandLineParams",
          gcd: "gcd",
          split: "split",
          split_whitespace: "split",
          "size[byte]": "len",
          "size[List]": "len",
          "size[Table]": "len",
          repeat: "repeat",
          max: "max",
          min: "min",
          abs: "abs",
          dec_to_int: "parseInt",
          "println[Text]": "echo",
          bool_to_int: "int",
          "char[byte]": "chr",
          "find[List]": "system.find",
          "find[byte]": "find",
          "sorted[Int]": "sorted",
          "sorted[Ascii]": "sorted",
          "reversed[List]": "reversed",
          int_to_bin: "toBin",
          int_to_Hex: "toHex",
          right_align: "align",
          starts_with: "startsWith",
          ends_with: "endsWith",
          bit_count: "popcount",
          join: withDefaults`join`,
          replace: withDefaults`replace`,
        },
        "leftChain",
      ),
      mapMutationTo.infix({
        add: "+=",
        sub: "-=",
        mul: "*=",
        "concat[Text]": "&=",
        "concat[List]": "&=",
        append: "&=",
      }),
      mapOpsTo.infix({
        "contains[Array]": flipped`system.in`,
        "contains[List]": flipped`system.in`,
        "contains[Text]": flipped`in`,
        "contains[Table]": flipped`system.in`,
        pow: "^",
        trunc_div: "div",
        rem: "mod",
        unsigned_rem: "%%",
        unsigned_trunc_div: "/%",
        bit_shift_left: "shl",
        bit_shift_right: "shr",
        add: "+",
        sub: "-",
        "concat[Text]": "&",
        "concat[List]": "&",
        append: "&",
        lt: "<",
        leq: "<=",
        "eq[Int]": "==",
        "eq[Text]": "==",
        "neq[Int]": "!=",
        "neq[Text]": "!=",
        geq: ">=",
        gt: ">",
        and: "and",
        bit_and: "and",
        or: "or",
        bit_or: "or",
        bit_xor: "xor",
      }),
      mapOpsTo.prefix({
        bit_not: "not",
        not: "not",
        neg: "-",
        int_to_dec: "$",
      }),
      mapOpsTo.infix({ mul: "*" }),
      removeToSeqFromFor,
      addNimImports,
    ),
    simplegolf(
      alias(
        {
          Integer: (x) => x.value.toString(),
          Text: (x) => `"${x.value}"`,
        },
        [1, 7],
      ),
    ),
    required(
      renameIdents(),
      addVarDeclarations,
      addVarDeclarationOneToManyAssignments(),
      addVarDeclarationManyToManyAssignments((_, spine) => spine.depth > 1),
      addManyToManyAssignments((_, spine) => spine.depth > 1),
      groupVarDeclarations((_, spine) => spine.depth <= 1),
      noStandaloneVarDeclarations,
      assertInt64,
      removeImplicitConversions,
      removeSystemNamespace,
      useImplicitForEachChar("byte"),
      removeImplicitConversions,
    ),
    search(useUFCS),
    simplegolf(useRawStringLiteral),
  ],
};

export default nimLanguage;
