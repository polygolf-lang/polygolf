import {
  functionCall as func,
  indexCall,
  methodCall as method,
  rangeIndexCall,
  text,
  int,
  op,
  listType,
  textType,
  succ,
  table,
  keyValue,
  type Text,
  builtin,
  isText,
  implicitConversion,
  infix,
  list,
  intToDecOpOrText,
} from "../../IR";
import {
  type Language,
  required,
  search,
  simplegolf,
} from "../../common/Language";

import emitProgram, { emitPythonText } from "./emit";
import {
  removeImplicitConversions,
  methodsAsFunctions,
  printIntToPrint,
  arraysToLists,
  mapOps,
  mapBackwardsIndexToForwards,
  mapMutationTo,
  mapOpsTo,
  flipped,
  withDefaults,
} from "../../plugins/ops";
import { alias, renameIdents } from "../../plugins/idents";
import {
  forArgvToForEach,
  forRangeToForEach,
  forRangeToForRangeOneStep,
  removeUnusedForVar,
} from "../../plugins/loops";
import { golfStringListLiteral, listOpsToTextOps } from "../../plugins/static";
import {
  golfLastPrint,
  implicitlyConvertPrintArg,
  putcToPrintChar,
} from "../../plugins/print";
import {
  packSource2to1,
  packSource3to1,
  useDecimalConstantPackedPrinter,
  useLowDecimalListPackedPrinter,
} from "../../plugins/packing";
import {
  textGetToIntToTextGet,
  textToIntToTextGetToInt,
  usePrimaryTextOps,
  useMultireplace,
  startsWithEndsWithToSliceEquality,
} from "../../plugins/textOps";
import {
  addOneToManyAssignments,
  inlineVariables,
  tempVarToMultipleAssignment,
} from "../../plugins/block";
import { addImports } from "../../plugins/imports";
import {
  applyDeMorgans,
  bitnotPlugins,
  decomposeIntLiteral,
  equalityToInequality,
  lowBitsPlugins,
  pickAnyInt,
  useImplicitBoolToInt,
  useIntegerTruthiness,
} from "../../plugins/arithmetic";
import { tableToListLookup } from "../../plugins/tables";
import { charLength } from "../../common/strings";
import { golfTextListLiteralIndex } from "./plugins";
import { safeConditionalOpToAt } from "../../plugins/conditions";

const pythonLanguage: Language = {
  name: "Python",
  extension: "py",
  emitter: emitProgram,
  phases: [
    required(printIntToPrint, arraysToLists, usePrimaryTextOps("codepoint")),
    simplegolf(golfLastPrint()),
    search(
      golfStringListLiteral(),
      listOpsToTextOps("find[codepoint]", "at[codepoint]"),
      tempVarToMultipleAssignment,
      forRangeToForEach("at[List]", "at[codepoint]"),
      equalityToInequality,
      useDecimalConstantPackedPrinter,
      useLowDecimalListPackedPrinter,
      textToIntToTextGetToInt,
      ...bitnotPlugins,
      ...lowBitsPlugins,
      applyDeMorgans,
      useIntegerTruthiness,
      forRangeToForRangeOneStep,
      tableToListLookup,
      useMultireplace(true),
      inlineVariables,
      forArgvToForEach,
      decomposeIntLiteral(),
      startsWithEndsWithToSliceEquality("codepoint"),
    ),
    simplegolf(safeConditionalOpToAt("List")),
    required(
      pickAnyInt,
      forArgvToForEach,
      removeUnusedForVar,
      putcToPrintChar,
      mapOps({
        argv: () => builtin("sys.argv[1:]"),

        "at[argv]": (a) =>
          op["at[List]"](
            { ...builtin("sys.argv"), type: listType(textType()) },
            succ(a),
          ),
      }),

      useImplicitBoolToInt,
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
    ),
    simplegolf(golfTextListLiteralIndex),
    required(
      textGetToIntToTextGet,
      implicitlyConvertPrintArg,
      mapOps({
        true: () => int(1),
        false: () => int(0),
        "find[byte]": (a, b) =>
          method(
            func("bytes", a, text("u8")),
            "find",
            func("bytes", b, text("u8")),
          ),
        "size[byte]": (a) => func("len", func("bytes", a, text("u8"))),
        "reversed[codepoint]": (a) =>
          rangeIndexCall(a, builtin(""), builtin(""), int(-1)),
        "reversed[byte]": (a) =>
          method(
            rangeIndexCall(
              func("bytes", a, text("u8")),
              builtin(""),
              builtin(""),
              int(-1),
            ),
            "decode",
            text("u8"),
          ),
        "reversed[List]": (a) =>
          rangeIndexCall(a, builtin(""), builtin(""), int(-1)),
        "at[codepoint]": (a, b) => indexCall(a, b),
        "at[byte]": (a, b) => op["char[byte]"](op["ord_at[byte]"](a, b)),
        "ord_at[byte]": (a, b) => indexCall(func("bytes", a, text("u8")), b),
        "ord_at_back[byte]": (a, b) =>
          indexCall(func("bytes", a, text("u8")), b),
        "slice[codepoint]": (a, b, c) =>
          rangeIndexCall(a, b, op.add(b, c), int(1)),
        "slice[byte]": (a, b, c) =>
          method(
            rangeIndexCall(
              func("bytes", a, text("u8")),
              b,
              op.add(b, c),
              int(1),
            ),
            "decode",
            text("u8"),
          ),
        "slice[List]": (a, b, c) => rangeIndexCall(a, b, op.add(b, c), int(1)),

        "print[Text]": (a) =>
          a.kind !== "ImplicitConversion"
            ? func("print", { end: a })
            : func("print", a, { end: text("") }),

        text_multireplace: (a, ...x) =>
          method(
            a,
            "translate",
            table(
              (x as Text[]).flatMap((_, i, x) =>
                i % 2 === 0
                  ? [
                      keyValue(
                        int(x[i].value.codePointAt(0)!),
                        charLength(x[i + 1].value) === 1 &&
                          x[i + 1].value.codePointAt(0)! < 100
                          ? int(x[i + 1].value.codePointAt(0)!)
                          : x[i + 1],
                      ),
                    ]
                  : [],
              ),
            ),
          ),
        append: (a, b) => op["concat[List]"](a, list([b])),
        right_align: (a, b) =>
          infix(
            "%",
            op["concat[Text]"](text("%"), intToDecOpOrText(b), text("s")),
            a,
          ),
        int_to_bin: (a) => func("format", a, text("b")),
        int_to_bin_aligned: (a, b) =>
          func(
            "format",
            a,
            op["concat[Text]"](text("0"), intToDecOpOrText(b), text("b")),
          ),
        int_to_hex: (a) => infix("%", text("%x"), a),
        int_to_Hex: (a) => infix("%", text("%X"), a),
        int_to_hex_aligned: (a, b) =>
          infix(
            "%",
            op["concat[Text]"](text("%0"), intToDecOpOrText(b), text("x")),
            a,
          ),
        int_to_Hex_aligned: (a, b) =>
          infix(
            "%",
            op["concat[Text]"](text("%0"), intToDecOpOrText(b), text("X")),
            a,
          ),
        int_to_bool: (a) => implicitConversion("int_to_bool", a),
        bool_to_int: (a) =>
          op.mul(int(1n), implicitConversion("bool_to_int", a)),
      }),
      mapOpsTo.method({
        "find[List]": "index",
        "find[codepoint]": "find",
        split: "split",
        split_whitespace: "split",
        replace: "replace",
        join: flipped`join`,
        starts_with: "startsWith",
        ends_with: "endsWith",
        bit_count: "bit_count",
      }),
      mapOpsTo.func({
        "read[line]": "input",
        abs: "abs",
        "size[List]": "len",
        "size[Table]": "len",
        "size[Set]": "len",
        "sorted[Int]": "sorted",
        "sorted[Ascii]": "sorted",
        "ord[codepoint]": "ord",
        "ord[byte]": "ord",
        "char[codepoint]": "chr",
        "char[byte]": "chr",
        max: "max",
        min: "min",
        "size[codepoint]": "len",
        int_to_dec: "str",
        dec_to_int: "int",
        "println[Text]": "print",
        gcd: "math.gcd",
        range_excl: withDefaults`range`,
      }),
      mapMutationTo.method({
        append: "append",
      }),
      mapMutationTo.infix({
        add: "+=",
        sub: "-=",
        mul: "*=",
        div: "//=",
        mod: "%=",
        pow: "**=",
        bit_and: "&=",
        bit_xor: "^=",
        bit_or: "|=",
        bit_shift_left: "<<=",
        bit_shift_right: ">>=",
      }),
      mapOpsTo.infix({
        "contains[List]": flipped`in`,
        "contains[Table]": flipped`in`,
        "contains[Set]": flipped`in`,
        "contains[Text]": flipped`in`,
        pow: "**",
        repeat: "*",
        div: "//",
        mod: "%",
        add: "+",
        "concat[Text]": "+",
        "concat[List]": "+",
        sub: "-",
        bit_shift_left: "<<",
        bit_shift_right: ">>",
        bit_and: "&",
        bit_xor: "^",
        bit_or: "|",
        lt: "<",
        leq: "<=",
        "eq[Int]": "==",
        "eq[Text]": "==",
        "neq[Int]": "!=",
        "neq[Text]": "!=",
        geq: ">=",
        gt: ">",
        and: "and",
        or: "or",
      }),
      mapOpsTo.prefix({
        neg: "-",
        bit_not: "~",
        not: "not",
      }),
      mapOpsTo.infix({ mul: "*" }),
      methodsAsFunctions,
      addOneToManyAssignments(),
    ),
    simplegolf(
      alias({
        Identifier: (n, s) =>
          n.builtin &&
          (s.parent?.node.kind !== "PropertyCall" || s.pathFragment !== "ident")
            ? n.name
            : undefined,
        // TODO: handle more general cases
        PropertyCall: (n) =>
          isText()(n.object) && n.ident.builtin
            ? `"${n.object.value}".${n.ident.name}`
            : undefined,
        Integer: (x) => x.value.toString(),
        Text: (x) => `"${x.value}"`,
      }),
    ),
    required(
      renameIdents(),
      addImports({
        "sys.argv[1:]": "sys",
        "sys.argv": "sys",
        "math.gcd": "math",
      }),
      removeImplicitConversions,
    ),
  ],
  packers: [
    {
      codepointRange: [1, Infinity],
      pack(x) {
        return `exec(bytes(${emitPythonText(packSource2to1(x))},'u16')[2:])`;
      },
    },
    {
      codepointRange: [32, 127],
      pack(x) {
        return `exec(bytes(ord(c)%i+32for c in${emitPythonText(
          packSource3to1(x),
        )}for i in b'abc'))`;
      },
    },
  ],
};

export default pythonLanguage;
