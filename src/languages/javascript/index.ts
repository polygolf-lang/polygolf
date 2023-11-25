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
  flattenTree,
  defaultWhitespaceInsertLogic,
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
  usePrimaryTextOps,
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
    simplegolf(golfLastPrint()),
    search(
      golfStringListLiteral(),
      forRangeToForEach("at[Array]", "at[List]", "at[codepoint]"),
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
        "eq[Int]": "int",
        "neq[Int]": "int",
        geq: "int",
        gt: "int",
      }),
      mapVarsThatNeedBigint("int53", (x) => func("BigInt", x)),
      forArgvToForEach,
    ),
    simplegolf(forRangeToForEachKey),
    required(
      forRangeToForCLike,
      usePrimaryTextOps("codepoint"), // TODO should be "codeunit"
      mapOps({
        dec_to_int: (x) =>
          op("add", int(0n), implicitConversion("dec_to_int", x[0])),
        argv: builtin("arguments"),

        "at[argv]": (x) =>
          op(
            "at[List]",
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
        "at[codepoint]": (x) => indexCall(x[0], x[1]),
        div: (x, s) =>
          s.node.targetType !== "bigint"
            ? func("Math.floor", infix("/", x[0], x[1]))
            : undefined,
        int_to_bin: (x) => method(x[0], "toString", int(2)),
        int_to_hex: (x) => method(x[0], "toString", int(16)),
        "size[List]": (x) => propertyCall(x[0], "length"),
        join: (x) => method(x[0], "join", ...(isText(",")(x[1]) ? [] : [x[1]])),
        int_to_dec: (x) =>
          op("concat[Text]", text(""), implicitConversion("int_to_dec", x[0])),
        dec_to_int: (x) =>
          op("mul", int(1n), implicitConversion("dec_to_int", x[0])),
      }),
      mapTo((name: string, [obj, ...args]) => method(obj, name, ...args))({
        "contains[List]": "includes",
        push: "push",
        "find[List]": "indexOf",
        split: "split",
        replace: "replaceAll",
        repeat: "repeat",
        "contains[Text]": "includes",
      }),
      mapTo(func)({
        abs: "abs",
        max: "Math.max",
        min: "Math.min",
        "println[Text]": "print",
        "print[Text]": "write",
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
          "concat[Text]": "+",
          sub: "-",
          bit_shift_left: "<<",
          bit_shift_right: ">>",
          bit_and: "&",
          bit_xor: "^",
          bit_or: "|",
          lt: "<",
          leq: "<=",
          "eq[Int]": "==",
          "neq[Int]": "!=",
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
  detokenizer(tree) {
    let result = "";
    flattenTree(tree).forEach((token, i, tokens) => {
      if (i === tokens.length - 1) result += token;
      else {
        const nextToken = tokens[i + 1];
        if (token === "\n" && "([`+-/".includes(nextToken[0])) {
          token = ";";
        }
        result += token;
        if (defaultWhitespaceInsertLogic(token, nextToken)) {
          result += " ";
        }
      }
    });
    return result;
  },
};

export default javascriptLanguage;
