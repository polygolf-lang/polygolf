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
  namedArg,
  add1,
  table,
  keyValue,
  type Text,
  builtin,
  isText,
  implicitConversion,
  infix,
  list,
} from "../../IR";
import {
  type Language,
  required,
  search,
  simplegolf,
} from "../../common/Language";

import emitProgram, { emitPythonText } from "./emit";
import {
  useIndexCalls,
  removeImplicitConversions,
  methodsAsFunctions,
  printIntToPrint,
  arraysToLists,
  mapOps,
  mapOpsToFunc,
  mapOpsToFlippedInfix,
  mapMutationToInfix,
  mapOpsToInfix,
  mapOpsToPrefix,
  mapMutationToMethod,
  mapBackwardsIndexToForwards,
} from "../../plugins/ops";
import { alias, renameIdents } from "../../plugins/idents";
import {
  forArgvToForEach,
  forRangeToForEach,
  forRangeToForRangeOneStep,
  removeUnusedForVar,
} from "../../plugins/loops";
import {
  golfStringListLiteral,
  hardcode,
  listOpsToTextOps,
} from "../../plugins/static";
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
    search(hardcode()),
    required(printIntToPrint, arraysToLists),
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
    ),
    simplegolf(safeConditionalOpToAt("List")),
    required(
      pickAnyInt,
      forArgvToForEach,
      removeUnusedForVar,
      putcToPrintChar,
      usePrimaryTextOps("codepoint"),
      mapOps({
        argv: builtin("sys.argv[1:]"),

        "at[argv]": (x) =>
          op(
            "at[List]",
            { ...builtin("sys.argv"), type: listType(textType()) },
            add1(x[0]),
          ),
      }),

      useImplicitBoolToInt,
      mapBackwardsIndexToForwards({
        "at_back[Ascii]": undefined,
        "at_back[byte]": undefined,
        "at_back[codepoint]": undefined,
        "at_back[List]": undefined,
        "with_at_back[List]": undefined,
      }),
      useIndexCalls(),
    ),
    simplegolf(golfTextListLiteralIndex),
    required(
      textGetToIntToTextGet,
      implicitlyConvertPrintArg,
      mapOps({
        true: int(1),
        false: int(0),
        "find[List]": (x) => method(x[0], "index", x[1]),
        "find[codepoint]": (x) => method(x[0], "find", x[1]),
        "find[byte]": (x) =>
          method(
            func("bytes", x[0], text("u8")),
            "find",
            func("bytes", x[1], text("u8")),
          ),
        join: (x) => method(x[1], "join", x[0]),
        "size[byte]": (x) => func("len", func("bytes", x[0], text("u8"))),
        "reversed[codepoint]": (x) =>
          rangeIndexCall(x[0], builtin(""), builtin(""), int(-1)),
        "reversed[byte]": (x) =>
          method(
            rangeIndexCall(
              func("bytes", x[0], text("u8")),
              builtin(""),
              builtin(""),
              int(-1),
            ),
            "decode",
            text("u8"),
          ),
        "reversed[List]": (x) =>
          rangeIndexCall(x[0], builtin(""), builtin(""), int(-1)),
        "at[codepoint]": (x) => indexCall(x[0], x[1]),
        "at[byte]": (x) => op("char[byte]", op("ord_at[byte]", x[0], x[1])),
        "ord_at[byte]": (x) => indexCall(func("bytes", x[0], text("u8")), x[1]),
        "ord_at_back[byte]": (x) =>
          indexCall(func("bytes", x[0], text("u8")), x[1]),
        "slice[codepoint]": (x) =>
          rangeIndexCall(x[0], x[1], op("add", x[1], x[2]), int(1)),
        "slice[byte]": (x) =>
          method(
            rangeIndexCall(
              func("bytes", x[0], text("u8")),
              x[1],
              op("add", x[1], x[2]),
              int(1),
            ),
            "decode",
            text("u8"),
          ),
        "slice[List]": (x) =>
          rangeIndexCall(x[0], x[1], op("add", x[1], x[2]), int(1)),
        split: (x) => method(x[0], "split", x[1]),
        split_whitespace: (x) => method(x[0], "split"),

        "print[Text]": (x) =>
          func(
            "print",
            x[0].kind !== "ImplicitConversion"
              ? [namedArg("end", x[0])]
              : [x[0], namedArg("end", text(""))],
          ),
        replace: (x) => method(x[0], "replace", x[1], x[2]),

        text_multireplace: (x) =>
          method(
            x[0],
            "translate",
            table(
              (x as Text[]).flatMap((_, i, x) =>
                i % 2 > 0
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
        append: (x) => op("concat[List]", x[0], list([x[1]])),
        right_align: (x) =>
          infix(
            "%",
            op("concat[Text]", text("%"), op("int_to_dec", x[1]), text("s")),
            x[0],
          ),
        int_to_bin: (x) => func("format", x[0], text("b")),
        int_to_bin_aligned: (x) =>
          func(
            "format",
            x[0],
            op("concat[Text]", text("0"), op("int_to_dec", x[1]), text("b")),
          ),
        int_to_hex: (x) => infix("%", text("%X"), x[0]),
        int_to_hex_aligned: (x) =>
          infix(
            "%",
            op("concat[Text]", text("%0"), op("int_to_dec", x[1]), text("X")),
            x[0],
          ),
        int_to_bool: (x) => implicitConversion("int_to_bool", x[0]),
        bool_to_int: (x) =>
          op("mul", int(1n), implicitConversion("bool_to_int", x[0])),
        include: (x) => method(x[0], "add", x[1]),
      }),
      mapOpsToFunc({
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
      }),
      mapOpsToFlippedInfix({
        "contains[List]": "in",
        "contains[Table]": "in",
        "contains[Set]": "in",
        "contains[Text]": "in",
      }),
      mapMutationToMethod({
        append: "append",
      }),
      mapMutationToInfix({
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
      mapOpsToPrefix({
        neg: "-",
        bit_not: "~",
        not: "not",
      }),
      mapOpsToInfix({
        pow: "**",
        mul: "*",
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
