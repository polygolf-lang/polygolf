import {
  functionCall as func,
  indexCall,
  methodCall as method,
  op,
  listType,
  textType,
  builtin,
  infix,
  int,
  propertyCall,
  isText,
  text,
  implicitConversion,
} from "../../IR";
import {
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
  removeImplicitConversions,
  printIntToPrint,
  mapTo,
  addPostfixIncAndDec,
  methodsAsFunctions,
} from "../../plugins/ops";
import { alias, renameIdents } from "../../plugins/idents";
import {
  forArgvToForEach,
  forRangeToForCLike,
  forRangeToForEach,
} from "../../plugins/loops";
import { golfStringListLiteral, hardcode } from "../../plugins/static";
import { golfLastPrint, implicitlyConvertPrintArg } from "../../plugins/print";
import {
  useDecimalConstantPackedPrinter,
  useLowDecimalListPackedPrinter,
} from "../../plugins/packing";
import {
  replaceToSplitAndJoin,
  textGetToIntToTextGet,
  textToIntToTextGetToInt,
  useEquivalentTextOp,
} from "../../plugins/textOps";
import { addOneToManyAssignments, inlineVariables } from "../../plugins/block";
import {
  applyDeMorgans,
  bitnotPlugins,
  decomposeIntLiteral,
  equalityToInequality,
  lowBitsPlugins,
  pickAnyInt,
  useIntegerTruthiness,
} from "../../plugins/arithmetic";
import { tableToListLookup } from "../../plugins/tables";
import { floodBigints, mapVarsThatNeedBigint } from "../../plugins/types";
import { forRangeToForEachKey, propertyCallToIndexCall } from "./plugins";

const javascriptLanguage: Language = {
  name: "Javascript",
  extension: "js",
  emitter: emitProgram,
  phases: [
    search(hardcode()),
    required(printIntToPrint),
    search(
      golfStringListLiteral(),
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
      tableToListLookup,
      inlineVariables,
      forArgvToForEach,
      replaceToSplitAndJoin,
      useEquivalentTextOp(false, true),
      useIndexCalls(),
      decomposeIntLiteral(),
    ),
    required(
      pickAnyInt,
      floodBigints("int53", {
        Assignment: "bigint",
        add: "bigint",
        sub: "bigint",
        mul: "bigint",
        mod: "bigint",
        pow: "bigint",
        bit_and: "bigint",
        bit_xor: "bigint",
        bit_or: "bigint",
        bit_shift_left: "bigint",
        bit_shift_right: "bigint",
        lt: "int",
        leq: "int",
        eq: "int",
        neq: "int",
        geq: "int",
        gt: "int",
      }),
      mapVarsThatNeedBigint("int53", (x) => func("BigInt", x)),
      forArgvToForEach,
    ),
    simplegolf(forRangeToForEachKey),
    required(
      forRangeToForCLike,
      useEquivalentTextOp(false, true),
      mapOps({
        text_to_int: (x) =>
          op("add", int(0n), implicitConversion("text_to_int", x[0])),
        argv: builtin("arguments"),

        argv_get: (x) =>
          op(
            "list_get",
            { ...builtin("arguments"), type: listType(textType()) },
            x[0],
          ),
      }),
      useIndexCalls(),

      textGetToIntToTextGet,
      implicitlyConvertPrintArg,
      mapOps({
        true: builtin("true"),
        false: builtin("false"),
        text_get_codepoint: (x) => indexCall(x[0], x[1]),
        div: (x, s) =>
          s.node.targetType !== "bigint"
            ? func("Math.floor", infix("/", x[0], x[1]))
            : undefined,
        int_to_bin: (x) => method(x[0], "toString", int(2)),
        int_to_hex: (x) => method(x[0], "toString", int(16)),
        list_length: (x) => propertyCall(x[0], "length"),
        join: (x) => method(x[0], "join", ...(isText(",")(x[1]) ? [] : [x[1]])),
        int_to_text: (x) =>
          op("concat", text(""), implicitConversion("int_to_text", x[0])),
        text_to_int: (x) =>
          op("mul", int(1n), implicitConversion("text_to_int", x[0])),
      }),
      mapTo((name: string, [obj, ...args]) => method(obj, name, ...args))({
        list_contains: "includes",
        list_push: "push",
        list_find: "indexOf",
        text_split: "split",
        text_replace: "replaceAll",
        repeat: "repeat",
        text_contains: "includes",
      }),
      mapTo(func)({
        abs: "abs",
        max: "Math.max",
        min: "Math.min",
        println: "print",
        print: "write",
      }),
      mapToPrefixAndInfix(
        {
          pow: "**",
          neg: "-",
          bit_not: "~",
          mul: "*",
          div: "/",
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
          not: "!",
          and: "&&",
          or: "||",
        },
        ["**", "*", "/", "%", "+", "-", "<<", ">>", "&", "^", "|", "&&", "||"],
      ),
      addPostfixIncAndDec,
      methodsAsFunctions,
      addOneToManyAssignments(),
    ),
    search(propertyCallToIndexCall),
    simplegolf(
      alias({
        Identifier: (n, s) =>
          n.builtin &&
          (s.parent?.node.kind !== "PropertyCall" || s.pathFragment !== "ident")
            ? n.name
            : undefined,
        Integer: (x) => x.value.toString(),
        Text: (x) => `"${x.value}"`,
      }),
    ),
    required(renameIdents(), removeImplicitConversions),
  ],
};

export default javascriptLanguage;
