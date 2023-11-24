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
} from "../../IR";
import {
  type Language,
  required,
  search,
  simplegolf,
} from "../../common/Language";

import emitProgram, { emitPythonText } from "./emit";
import {
  mapOps,
  mapToPrefixAndInfix,
  useIndexCalls,
  removeImplicitConversions,
  methodsAsFunctions,
  printIntToPrint,
  mapTo,
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
import { golfLastPrint, implicitlyConvertPrintArg } from "../../plugins/print";
import {
  packSource2to1,
  packSource3to1,
  useDecimalConstantPackedPrinter,
  useLowDecimalListPackedPrinter,
} from "../../plugins/packing";
import {
  textGetToIntToTextGet,
  textToIntToTextGetToInt,
  useEquivalentTextOp,
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
import { safeConditionalOpToCollectionGet } from "../../plugins/conditions";

const pythonLanguage: Language = {
  name: "Python",
  extension: "py",
  emitter: emitProgram,
  phases: [
    search(hardcode()),
    required(printIntToPrint),
    search(
      golfStringListLiteral(),
      listOpsToTextOps("text_codepoint_find", "text_get_codepoint"),
      tempVarToMultipleAssignment,
      forRangeToForEach("array_get", "list_get", "text_get_codepoint"),
      golfLastPrint(),
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
      useEquivalentTextOp(false, true),
      decomposeIntLiteral(),
    ),
    simplegolf(safeConditionalOpToCollectionGet("list")),
    required(
      pickAnyInt,
      forArgvToForEach,
      removeUnusedForVar,
      useEquivalentTextOp(false, true),
      mapOps({
        argv: builtin("sys.argv[1:]"),

        argv_get: (x) =>
          op(
            "list_get",
            { ...builtin("sys.argv"), type: listType(textType()) },
            add1(x[0]),
          ),
      }),

      useImplicitBoolToInt,
      useIndexCalls(),
    ),
    simplegolf(golfTextListLiteralIndex),
    required(
      textGetToIntToTextGet,
      implicitlyConvertPrintArg,
      mapOps({
        true: int(1),
        false: int(0),
        list_find: (x) => method(x[0], "index", x[1]),
        join: (x) => method(x[1], "join", x[0]),

        text_codepoint_reversed: (x) =>
          rangeIndexCall(x[0], builtin(""), builtin(""), int(-1)),
        text_get_codepoint: (x) => indexCall(x[0], x[1]),

        text_get_codepoint_slice: (x) =>
          rangeIndexCall(x[0], x[1], add1(x[2]), int(1)),
        text_split: (x) => method(x[0], "split", x[1]),
        text_split_whitespace: (x) => method(x[0], "split"),

        print: (x) =>
          func(
            "print",
            x[0].kind !== "ImplicitConversion"
              ? [namedArg("end", x[0])]
              : [x[0], namedArg("end", text(""))],
          ),
        text_replace: (x) => method(x[0], "replace", x[1], x[2]),

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
      }),
      mapTo(func)({
        read_line: "input",
        abs: "abs",
        list_length: "len",
        sorted: "sorted",
        codepoint_to_int: "ord",
        int_to_codepoint: "chr",
        max: "max",
        min: "min",
        text_codepoint_length: "len",
        int_to_text: "str",
        text_to_int: "int",
        println: "print",
      }),
      mapToPrefixAndInfix(
        {
          pow: "**",
          neg: "-",
          bit_not: "~",
          mul: "*",
          repeat: "*",
          div: "//",
          mod: "%",
          add: "+",
          concat: "+",
          sub: "-",
          bit_shift_left: "<<",
          bit_shift_right: ">>",
          bit_and: "&",
          bit_xor: "^",
          bit_or: "|",
          lt: "<",
          leq: "<=",
          eq: "==",
          neq: "!=",
          geq: ">=",
          gt: ">",
          not: "not",
          and: "and",
          or: "or",
        },
        ["+", "-", "*", "//", "%", "**", "&", "^", "|", "<<", ">>"],
      ),
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
      addImports({ "sys.argv[1:]": "sys", "sys.argv": "sys" }),
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
