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
  addMutatingInfix,
  removeImplicitConversions,
  printIntToPrint,
  mapTo,
  addPostfixIncAndDec,
} from "../../plugins/ops";
import { alias, renameIdents } from "../../plugins/idents";
import {
  forArgvToForEach,
  forRangeToForCLike,
  forRangeToForEach,
} from "../../plugins/loops";
import { golfStringListLiteral, listOpsToTextOps } from "../../plugins/static";
import { golfLastPrint, implicitlyConvertPrintArg } from "../../plugins/print";
import {
  useDecimalConstantPackedPrinter,
  useLowDecimalListPackedPrinter,
} from "../../plugins/packing";
import {
  textGetToIntToTextGet,
  textToIntToTextGetToInt,
  useEquivalentTextOp,
} from "../../plugins/textOps";
import {
  addOneToManyAssignments,
  inlineVariables,
  tempVarToMultipleAssignment,
} from "../../plugins/block";
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

const javascriptLanguage: Language = {
  name: "Javascript",
  extension: "js",
  emitter: emitProgram,
  phases: [
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
      tableToListLookup,
      inlineVariables,
      forArgvToForEach,
      useEquivalentTextOp(false, true),
      useIndexCalls(),
      decomposeIntLiteral(),
    ),
    required(
      pickAnyInt,
      forArgvToForEach,
      forRangeToForCLike,
      useEquivalentTextOp(false, true),
      mapOps({
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
        div: (x) => func("Math.floor", infix("/", x[0], x[1])),
        int_to_bin: (x) => method(x[0], "toString", int(2)),
        int_to_hex: (x) => method(x[0], "toString", int(16)),
        list_length: (x) => propertyCall(x[0], "length"),
        join: (x) => method(x[0], "join", ...(isText(",")(x[1]) ? [] : [x[1]])),
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
        int_to_text: "String",
        text_to_int: "Number",
        println: "print",
        print: "write",
      }),
      addMutatingInfix({
        add: "+",
        concat: "+",
        sub: "-",
        mul: "*",
        mod: "%",
        pow: "**",
        bit_and: "&",
        bit_xor: "^",
        bit_or: "|",
        bit_shift_left: "<<",
        bit_shift_right: ">>",
      }),
      addPostfixIncAndDec,
      mapToPrefixAndInfix({
        pow: "**",
        neg: "-",
        bit_not: "~",
        mul: "*",
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
      }),
      addOneToManyAssignments(),
    ),
    simplegolf(
      alias({
        Identifier: (n, s) =>
          n.builtin &&
          ((s.parent?.node.kind !== "PropertyCall" &&
            s.parent?.node.kind !== "MethodCall") ||
            s.pathFragment !== "ident")
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
