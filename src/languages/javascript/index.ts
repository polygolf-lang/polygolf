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
  list,
  prefix,
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
  addIncAndDec,
  methodsAsFunctions,
} from "../../plugins/ops";
import { alias, renameIdents } from "../../plugins/idents";
import {
  forArgvToForEach,
  forRangeToForCLike,
  forRangeToForEach,
} from "../../plugins/loops";
import { golfStringListLiteral, hardcode } from "../../plugins/static";
import {
  golfLastPrint,
  implicitlyConvertPrintArg,
  putcToPrintChar,
} from "../../plugins/print";
import {
  useDecimalConstantPackedPrinter,
  useLowDecimalListPackedPrinter,
} from "../../plugins/packing";
import {
  replaceToSplitAndJoin,
  textGetToIntToTextGet,
  textToIntToFirstIndexTextGetToInt,
  textToIntToTextGetToInt,
} from "../../plugins/textOps";
import { addOneToManyAssignments, inlineVariables } from "../../plugins/block";
import {
  applyDeMorgans,
  bitnotPlugins,
  decomposeIntLiteral,
  equalityToInequality,
  lowBitsPlugins,
  pickAnyInt,
  truncatingOpsPlugins,
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
      forRangeToForEachKey,
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
      putcToPrintChar,
    ),
    required(
      forRangeToForCLike,
      mapOps({
        argv: builtin("arguments"),

        "at[argv]": (x) =>
          op(
            "at[List]",
            { ...builtin("arguments"), type: listType(textType()) },
            x[0],
          ),
      }),
      useIndexCalls(),

      ...truncatingOpsPlugins,
      textGetToIntToTextGet,
      implicitlyConvertPrintArg,
      textToIntToFirstIndexTextGetToInt,
      mapOps({
        true: builtin("true"),
        false: builtin("false"),
        "at[Ascii]": (x) => indexCall(x[0], x[1]),
        "slice[List]": (x) =>
          method(x[0], "slice", x[1], op("add", x[1], x[2])),
        "slice[Ascii]": (x) =>
          method(x[0], "slice", x[1], op("add", x[1], x[2])),
        "char[Ascii]": (x) => func("String.fromCharCode", x),
        "char[byte]": (x) => func("String.fromCharCode", x),
        "sorted[Ascii]": (x) =>
          method(
            x[0].kind === "List" ? x[0] : list([prefix("...", x[0])]),
            "sort",
          ),
        div: (x, s) =>
          s.node.targetType !== "bigint"
            ? func("Math.floor", infix("/", x[0], x[1]))
            : undefined,
        trunc_div: (x, s) =>
          s.node.targetType !== "bigint"
            ? func("Math.floor", infix("/", x[0], x[1]))
            : undefined,
        int_to_bin: (x) => method(x[0], "toString", int(2n)),
        int_to_bin_aligned: (x) =>
          method(method(x[0], "toString", int(2n)), "padStart", x[1], int(0n)),
        int_to_hex: (x) => method(x[0], "toString", int(16n)),
        int_to_hex_aligned: (x) =>
          method(method(x[0], "toString", int(16n)), "padStart", x[1], int(0n)),
        "size[List]": (x) => propertyCall(x[0], "length"),
        "size[Ascii]": (x) => propertyCall(x[0], "length"),
        "size[Table]": (x) => propertyCall(func("Object.keys", x[0]), "length"),
        right_align: (x) => method(x[0], "padStart", x[1]),
        join: (x) => method(x[0], "join", ...(isText(",")(x[1]) ? [] : [x[1]])),
        int_to_dec: (x) =>
          op("concat[Text]", text(""), implicitConversion("int_to_dec", x[0])),
        dec_to_int: (x) =>
          op("bit_not", op("bit_not", implicitConversion("dec_to_int", x[0]))),
        "reversed[List]": (x) => method(x[0], "reverse"),
        "reversed[Ascii]": (x) =>
          method(
            method(list([prefix("...", x[0])]), "reverse"),
            "join",
            text(""),
          ),
        "reversed[codepoint]": (x) =>
          method(
            method(list([prefix("...", x[0])]), "reverse"),
            "join",
            text(""),
          ),
        append: (x) => op("concat[List]", x[0], list([x[1]])),
        bool_to_int: (x) => implicitConversion("bool_to_int", x[0]),
        int_to_bool: (x) => implicitConversion("int_to_bool", x[0]),
        "contains[Table]": (x) => infix("in", x[1], x[0]),
      }),
      mapTo((name: string, [obj, ...args]) => method(obj, name, ...args))({
        "ord_at[Ascii]": "charCodeAt",
        "contains[List]": "includes",
        "contains[Array]": "includes",
        "contains[Text]": "includes",
        push: "push",
        include: "add",
        "find[List]": "indexOf",
        "find[Ascii]": "indexOf",
        split: "split",
        replace: "replaceAll",
        repeat: "repeat",
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
          trunc_div: "/",
          mod: "%",
          rem: "%",
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
          not: "!",
          and: "&&",
          or: "||",
        },
        ["**", "*", "/", "%", "+", "-", "<<", ">>", "&", "^", "|", "&&", "||"],
      ),
      methodsAsFunctions,
    ),
    simplegolf(addIncAndDec(), addOneToManyAssignments()),
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
