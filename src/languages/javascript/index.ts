import {
  functionCall as func,
  indexCall,
  methodCall as method,
  op,
  listType,
  textType,
  builtin,
  int,
  propertyCall as property,
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
  removeImplicitConversions,
  printIntToPrint,
  methodsAsFunctions,
  mapOps,
  mapOpsTo,
  mapMutationTo,
  flipped,
} from "../../plugins/ops";
import { alias, renameIdents } from "../../plugins/idents";
import {
  forArgvToForEach,
  forRangeToForCLike,
  forRangeToForEach,
} from "../../plugins/loops";
import { golfStringListLiteral } from "../../plugins/static";
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
  charToIntToDec,
  ordToDecToInt,
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
  divisionToComparisonAndBack,
  equalityToInequality,
  lowBitsPlugins,
  pickAnyInt,
  truncatingOpsPlugins,
  useIntegerTruthiness,
} from "../../plugins/arithmetic";
import { tableToListLookup } from "../../plugins/tables";
import { floodBigints, mapVarsThatNeedBigint } from "../../plugins/types";
import {
  forRangeToForEachKey,
  numberDivisionToSlash,
  propertyCallToIndexCall,
  useRegexAsReplacePattern,
} from "./plugins";

const javascriptLanguage: Language = {
  name: "Javascript",
  extension: "js",
  emitter: emitProgram,
  phases: [
    required(printIntToPrint),
    simplegolf(golfLastPrint(), charToIntToDec, ordToDecToInt),
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
      useRegexAsReplacePattern,
      decomposeIntLiteral(),
      forRangeToForEachKey,
      ...divisionToComparisonAndBack,
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
        int_to_dec: "bigint",
      }),
      mapVarsThatNeedBigint("int53", (x) => func("BigInt", x)),
      forArgvToForEach,
      putcToPrintChar,
    ),
    required(
      forRangeToForCLike,
      mapOpsTo.builtin({
        true: "true",
        false: "false",
        argv: "arguments",
      }),
      mapOps({
        "at[argv]": (a) =>
          op["at[List]"](
            { ...builtin("arguments"), type: listType(textType()) },
            a,
          ),
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

      ...truncatingOpsPlugins,
      textGetToIntToTextGet,
      implicitlyConvertPrintArg,
      textToIntToFirstIndexTextGetToInt,
      mapMutationTo.method({
        append: "push",
      }),
      numberDivisionToSlash,
      mapOps({
        "at[Ascii]": (a, b) => indexCall(a, b),
        "slice[List]": (a, b, c) => method(a, "slice", b, op.add(b, c)),
        "slice[Ascii]": (a, b, c) => method(a, "slice", b, op.add(b, c)),
        "sorted[Ascii]": (a) =>
          method(a.kind === "List" ? a : list([prefix("...", a)]), "sort"),

        int_to_bin: (a) => method(a, "toString", int(2n)),
        int_to_bin_aligned: (a, b) =>
          method(method(a, "toString", int(2n)), "padStart", b, int(0n)),
        int_to_hex: (a) => method(a, "toString", int(16n)),
        int_to_Hex: (a) =>
          method(method(a, "toString", int(16n)), "toUpperCase"),
        int_to_hex_aligned: (a, b) =>
          method(method(a, "toString", int(16n)), "padStart", b, int(0n)),
        int_to_Hex_aligned: (a, b) =>
          method(
            method(method(a, "toString", int(16n)), "toUpperCase"),
            "padStart",
            b,
            int(0n),
          ),
        "size[List]": (a) => property(a, "length"),
        "size[Ascii]": (a) => property(a, "length"),
        "size[Table]": (a) => property(func("Object.keys", a), "length"),
        right_align: (a, b) => method(a, "padStart", b),
        join: (a, b) => method(a, "join", ...(isText(",")(b) ? [] : [b])),
        int_to_dec: (a) =>
          op["concat[Text]"](text(""), implicitConversion("int_to_dec", a)),
        dec_to_int: (a) =>
          op.bit_not(op.bit_not(implicitConversion("dec_to_int", a))),
        "reversed[List]": (a) => method(a, "reverse"),
        "reversed[Ascii]": (a) =>
          method(method(list([prefix("...", a)]), "reverse"), "join", text("")),
        "reversed[codepoint]": (a) =>
          method(method(list([prefix("...", a)]), "reverse"), "join", text("")),
        append: (a, b) => op["concat[List]"](a, list([b])),
        bool_to_int: (a) => implicitConversion("bool_to_int", a),
        int_to_bool: (a) => implicitConversion("int_to_bool", a),
        bit_count: (a) =>
          property(
            method(op.int_to_bin(a), "replace", builtin("/0/g,``")),
            "length",
          ),
        replace: (a, b, c) =>
          method(
            a,
            b.targetType === "regex g" ? "replace" : "replaceAll",
            b,
            c,
          ),
      }),
      mapMutationTo.prefix({
        succ: "++",
        pred: "--",
      }),
      mapMutationTo.infix({
        pow: "**=",
        mul: "*=",
        div: "/=",
        trunc_div: "/=",
        mod: "%=",
        rem: "%=",
        add: "+=",
        "concat[Text]": "+=",
        sub: "-=",
        bit_shift_left: "<<=",
        bit_shift_right: ">>=",
        bit_and: "&=",
        bit_xor: "^=",
        bit_or: "|=",
        and: "&&=",
        or: "||=",
      }),
      mapOpsTo.method({
        "ord_at[Ascii]": "charCodeAt",
        "contains[List]": "includes",
        "contains[Array]": "includes",
        "contains[Text]": "includes",
        include: "add",
        "find[List]": "indexOf",
        "find[Ascii]": "indexOf",
        "concat[List]": "concatenate",
        split: "split",
        repeat: "repeat",
        starts_with: "startsWith",
        ends_with: "endsWith",
      }),
      mapOpsTo.func({
        "char[Ascii]": "String.fromCharCode",
        "char[byte]": "String.fromCharCode",
        abs: "abs",
        max: "Math.max",
        min: "Math.min",
        "println[Text]": "print",
        "print[Text]": "write",
      }),
      mapOpsTo.infix({
        "contains[Table]": flipped`in`,
        pow: "**",
        div: "/",
        trunc_div: "/",
        mod: "%",
        rem: "%",
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
        "eq[Text]": "==",
        "neq[Int]": "!=",
        "neq[Text]": "!=",
        geq: ">=",
        gt: ">",
        and: "&&",
        or: "||",
      }),
      mapOpsTo.prefix({
        neg: "-",
        bit_not: "~",
        not: "!",
      }),
      mapOpsTo.infix({ mul: "*" }),
      methodsAsFunctions,
    ),
    simplegolf(addOneToManyAssignments()),
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
