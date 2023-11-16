import {
  functionCall as func,
  indexCall,
  int,
  rangeIndexCall,
  add1,
  array,
  isText,
  builtin,
  op,
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
  useIndexCalls,
  flipBinaryOps,
  removeImplicitConversions,
  printIntToPrint,
  mapTo,
} from "../../plugins/ops";
import { addNimImports, useUFCS, useUnsignedDivision } from "./plugins";
import { alias, renameIdents } from "../../plugins/idents";
import {
  forArgvToForEach,
  forArgvToForRange,
  forRangeToForEach,
  forRangeToForRangeInclusive,
  forRangeToForRangeOneStep,
  removeUnusedForVar,
  shiftRangeOneUp,
} from "../../plugins/loops";
import {
  golfStringListLiteral,
  hardcode,
  listOpsToTextOps,
} from "../../plugins/static";
import { golfLastPrint, implicitlyConvertPrintArg } from "../../plugins/print";
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
} from "../../plugins/arithmetic";

const nimLanguage: Language = {
  name: "Nim",
  extension: "nim",
  emitter: emitProgram,
  phases: [
    search(hardcode()),
    required(printIntToPrint),
    search(
      flipBinaryOps,
      golfStringListLiteral(),
      listOpsToTextOps("find[byte]", "at[byte]"),
      golfLastPrint(),
      forRangeToForEach("at[Array]", "at[List]", "at[byte]"),
      tempVarToMultipleAssignment,
      useDecimalConstantPackedPrinter,
      useLowDecimalListPackedPrinter,
      tableHashing(hash),
      tableToListLookup,
      equalityToInequality,
      shiftRangeOneUp,
      forRangeToForRangeInclusive(),
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
    ),
    required(
      pickAnyInt,
      forArgvToForEach,
      ...truncatingOpsPlugins,
      useIndexCalls(),
      usePrimaryTextOps("byte"),
      mapOps({
        argv: func("commandLineParams"),
        "at[argv]": (x) => func("paramStr", add1(x[0])),
      }),
      removeUnusedForVar,
      forRangeToForRangeInclusive(true),
      implicitlyConvertPrintArg,
      textToIntToFirstIndexTextGetToInt,
      mapOps({
        "ord_at[byte]": (x) => func("ord", op("at[byte]", ...x)),
        "read[line]": func("readLine", builtin("stdin")),
        join: (x) => func("join", isText("")(x[1]) ? [x[0]] : x),
        true: builtin("true"),
        false: builtin("false"),
        "at[byte]": (x) => indexCall(x[0], x[1]),
        "slice[byte]": (x) => rangeIndexCall(x[0], x[1], x[2], int(1n)),
        "print[Text]": (x) => func("write", builtin("stdout"), x),
        replace: (x) => func("replace", isText("")(x[2]) ? [x[0], x[1]] : x),
        text_multireplace: (x) =>
          func(
            "multireplace",
            x[0],
            array(
              x.flatMap((_, i) =>
                i % 2 > 0 ? [array(x.slice(i, i + 2))] : [],
              ), // Polygolf doesn't have array of tuples, so we use array of arrays instead
            ),
          ),
      }),
      mapTo(func)({
        split: "split",
        split_whitespace: "split",
        "size[byte]": "len",
        repeat: "repeat",
        max: "max",
        min: "min",
        abs: "abs",
        dec_to_int: "parseInt",
        "println[Text]": "echo",
        bool_to_int: "int",
        "char[byte]": "chr",
        "find[List]": "find",
      }),
      useUnsignedDivision,
      mapToPrefixAndInfix(
        {
          bit_not: "not",
          not: "not",
          neg: "-",
          int_to_dec: "$",
          pow: "^",
          mul: "*",
          trunc_div: "div",
          rem: "mod",
          unsigned_rem: "%%",
          unsigned_trunc_div: "/%",
          bit_shift_left: "shl",
          bit_shift_right: "shr",
          add: "+",
          sub: "-",
          "concat[Text]": "&",
          lt: "<",
          leq: "<=",
          "eq[Int]": "==",
          "neq[Int]": "!=",
          geq: ">=",
          gt: ">",
          and: "and",
          bit_and: "and",
          or: "or",
          bit_or: "or",
          bit_xor: "xor",
        },
        ["+", "*", "%%", "/%", "-", "&"],
      ),
      useUnsignedDivision,
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
      useUFCS,
    ),
  ],
  detokenizer: defaultDetokenizer((a, b) => {
    const left = a[a.length - 1];
    const right = b[0];

    if (/[A-Za-z0-9_]/.test(left) && /[A-Za-z0-9_]/.test(right)) return true; // alphanums meeting

    const symbols = "=+-*/<>@$~&%|!?^.:\\";
    if (symbols.includes(left) && symbols.includes(right)) return true; // symbols meeting

    if (
      /[A-Za-z]/.test(left) &&
      !["var", "in", "else", "if", "while", "for"].includes(a) &&
      (symbols + `"({`).includes(right) &&
      !["=", ":", ".", "::"].includes(b)
    )
      return true; // identifier meeting an operator or string literal or opening paren

    return false;
  }),
};

export default nimLanguage;
