import {
  functionCall as func,
  indexCall,
  methodCall as method,
  op,
  text,
  succ,
  propertyCall as prop,
  isText,
  builtin,
  int,
  postfix,
  isInt,
  list,
  conditional,
  rangeIndexCall,
  intToDecOpOrText,
} from "../../IR";
import {
  type Language,
  type TokenTree,
  flattenTree,
  required,
  search,
  simplegolf,
} from "../../common/Language";

import emitProgram from "./emit";
import {
  flipBinaryOps,
  removeImplicitConversions,
  printIntToPrint,
  arraysToLists,
  mapOps,
  mapOpsTo,
  mapBackwardsIndexToForwards,
  mapMutationTo,
} from "../../plugins/ops";
import { alias, renameIdents } from "../../plugins/idents";
import { golfStringListLiteral, listOpsToTextOps } from "../../plugins/static";
import {
  golfLastPrint,
  implicitlyConvertPrintArg,
  putcToPrintChar,
  mergePrint,
} from "../../plugins/print";
import { assertInt64 } from "../../plugins/types";
import {
  addVarDeclarations,
  groupVarDeclarations,
  inlineVariables,
  noStandaloneVarDeclarations,
} from "../../plugins/block";
import {
  forArgvToForEach,
  forRangeToForRangeInclusive,
  forRangeToForRangeOneStep,
} from "../../plugins/loops";
import {
  usePrimaryTextOps,
  textToIntToTextGetToInt,
  replaceToSplitAndJoin,
} from "../../plugins/textOps";
import { addImports } from "../../plugins/imports";
import {
  applyDeMorgans,
  equalityToInequality,
  truncatingOpsPlugins,
  bitnotPlugins,
  lowBitsPlugins,
  decomposeIntLiteral,
  pickAnyInt,
} from "../../plugins/arithmetic";

const swiftLanguage: Language = {
  name: "Swift",
  extension: "swift",
  emitter: emitProgram,
  phases: [
    required(printIntToPrint, arraysToLists, usePrimaryTextOps("codepoint")),
    simplegolf(golfLastPrint()),
    search(
      mergePrint,
      flipBinaryOps,
      golfStringListLiteral(false),
      listOpsToTextOps(),
      equalityToInequality,
      forRangeToForRangeInclusive(),
      ...bitnotPlugins,
      ...lowBitsPlugins,
      applyDeMorgans,
      forRangeToForRangeOneStep,
      inlineVariables,
      replaceToSplitAndJoin,
      textToIntToTextGetToInt,
      forArgvToForEach,
      ...truncatingOpsPlugins,
      mapOps({
        argv: () => builtin("CommandLine.arguments[1...]"),
        "at[argv]": (a) =>
          op["at[List]"](builtin("CommandLine.arguments"), succ(a)),
        "ord[codepoint]": (a) => op["ord_at[codepoint]"](a, int(0n)),
        "ord[byte]": (a) => op["ord_at[byte]"](a, int(0n)),
        "at[byte]": (a, b) => op["char[byte]"](op["ord_at[byte]"](a, b)),
      }),

      decomposeIntLiteral(),
    ),
    required(
      mapBackwardsIndexToForwards({
        "at_back[Ascii]": "size[Ascii]",
        "at_back[byte]": "size[byte]",
        "at_back[codepoint]": "size[codepoint]",
        "at_back[List]": "size[List]",
        "slice_back[Ascii]": "size[Ascii]",
        "slice_back[byte]": "size[byte]",
        "slice_back[codepoint]": "size[codepoint]",
        "slice_back[List]": "size[List]",
        "with_at_back[List]": "size[List]",
      }),
      putcToPrintChar,
      pickAnyInt,
      forArgvToForEach,
      ...truncatingOpsPlugins,
      mapOps({
        "read[line]": () => func("readLine"),
        argv: () => builtin("CommandLine.arguments[1...]"),
        "at[argv]": (a) =>
          op["at[List]"](builtin("CommandLine.arguments"), succ(a)),
        "ord[codepoint]": (a) => op["ord_at[codepoint]"](a, int(0n)),
        "ord[byte]": (a) => op["ord_at[byte]"](a, int(0n)),
        "at[byte]": (a, b) => op["char[byte]"](op["ord_at[byte]"](a, b)),
      }),
      implicitlyConvertPrintArg,
      mapOps({
        join: (a, b) =>
          method(a, "joined", isText("")(b) ? [] : { separator: b }),
        "ord_at[byte]": (a, b) =>
          func("Int", indexCall(func("Array", prop(a, "utf8")), b)),
        "at[codepoint]": (a, b) =>
          func("String", indexCall(func("Array", a), b)),
        "slice[codepoint]": (a, b, c) =>
          isInt(0n)(b)
            ? method(a, "prefix", c)
            : method(method(a, "prefix", op.add(b, c)), "suffix", c),
        "slice[List]": (a, b, c) => rangeIndexCall(a, b, op.add(b, c), int(1n)),
        "ord_at[codepoint]": (a, b) =>
          prop(indexCall(func("Array", prop(a, "unicodeScalars")), b), "value"),
        "char[byte]": (a) =>
          func("String", postfix("!", func("UnicodeScalar", a))),
        "char[codepoint]": (a) =>
          func("String", postfix("!", func("UnicodeScalar", a))),
        "size[codepoint]": (a) => prop(a, "count"),
        "size[byte]": (a) => prop(prop(a, "utf8"), "count"),
        "size[List]": (a) => prop(a, "count"),
        "size[Set]": (a) => prop(a, "count"),
        "size[Table]": (a) => prop(a, "count"),
        "reversed[codepoint]": (a) => func("String", method(a, "reversed")),
        "reversed[List]": (a) => func("Array", method(a, "reversed")),
        "sorted[Int]": (a) => method(a, "sorted"),
        "sorted[Ascii]": (a) => method(a, "sorted"),
        int_to_dec: (x) => func("String", x),
        split: (a, b) =>
          method(a, "split", {
            separator: b,
            omittingEmptySubsequences: op.false,
          }),
        repeat: (a, b) => func("String", { repeating: a, count: b }),
        "contains[Text]": (a, b) => method(a, "contains", b),
        "contains[List]": (a, b) => method(a, "contains", b),
        "contains[Set]": (a, b) => method(a, "contains", b),
        "contains[Table]": (a, b) => method(prop(a, "keys"), "contains", b),
        "find[List]": (a, b) => method(a, "index", { of: b }),
        "find[codepoint]": (a, b) =>
          conditional(
            op["contains[Text]"](a, b),
            op["size[codepoint]"](op["at[List]"](op.split(a, b), int(0n))),
            int(-1n),
          ),
        "find[byte]": (a, b) =>
          conditional(
            op["contains[Text]"](a, b),
            op["size[byte]"](op["at[List]"](op.split(a, b), int(0n))),
            int(-1n),
          ),
        pow: (a, b) =>
          func("Int", func("pow", func("Double", a), func("Double", b))),
        "println[Text]": (a) => func("print", a),
        "print[Text]": (a) => func("print", a, { terminator: text("") }),
        dec_to_int: (a) => postfix("!", func("Int", a)),
        append: (a, b) => op["concat[List]"](a, list([b])),
        include: (a, b) => method(a, "insert", b),
        bool_to_int: (a) => conditional(a, int(1n), int(0n)),
        int_to_bool: (a) => op["neq[Int]"](a, int(0n)),
        int_to_hex: (a) =>
          func("String", a, { radix: int(16n), uppercase: op.false }),
        int_to_Hex: (a) =>
          func("String", a, { radix: int(16n), uppercase: op.true }),
        int_to_bin: (a) => func("String", a, { radix: int(2n) }),
        int_to_hex_aligned: (a, b) =>
          func(
            "String",
            {
              format: op["concat[Text]"](
                text("%0"),
                intToDecOpOrText(b),
                text("x"),
              ),
            },
            a,
          ),
        int_to_Hex_aligned: (a, b) =>
          func(
            "String",
            {
              format: op["concat[Text]"](
                text("%0"),
                intToDecOpOrText(b),
                text("X"),
              ),
            },
            a,
          ),
        int_to_bin_aligned: (a, b) =>
          method(
            op["concat[Text]"](op.repeat(text("0"), b), op.int_to_bin(a)),
            "suffix",
            b,
          ),
        right_align: (a, b) =>
          method(op["concat[Text]"](op.repeat(text(" "), b), a), "suffix", b),

        replace: (a, b, c) =>
          method(a, "replacingOccurrences", { of: b, with: c }),
        starts_with: (a, b) => method(a, "hasPrefix", b),
        ends_with: (a, b) => method(a, "hasSuffix", b),
        bit_count: (a) =>
          prop(
            method(op.int_to_bin(a), "filter", builtin(`{$0>"0"}`)),
            "count",
          ),
      }),
      mapOpsTo.func({
        max: "max",
        min: "min",
        abs: "abs",
      }),
      mapOpsTo.builtin({ true: "true", false: "false" }),
      mapMutationTo.method({
        append: "append",
      }),
      mapMutationTo.infix({
        add: "+=",
        sub: "-=",
        mul: "*=",
        trunc_div: "/=",
        rem: "%=",
        bit_and: "&=",
        bit_or: "|=",
        bit_xor: "^=",
        bit_shift_left: "<<=",
        bit_shift_right: ">>=",
      }),
      mapOpsTo.infix({
        bit_shift_left: "<<",
        bit_shift_right: ">>",
        trunc_div: "/",
        rem: "%",
        bit_and: "&",
        add: "+",
        sub: "-",
        bit_or: "|",
        bit_xor: "^",
        "concat[Text]": "+",
        "concat[List]": "+",
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
        not: "!",
        neg: "-",
        bit_not: "~",
      }),
      mapOpsTo.infix({ mul: "*" }),
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
      addImports({
        pow: "Foundation",
        replacingOccurrences: "Foundation",
        format: "Foundation",
      }),
    ),
    simplegolf(
      alias({
        Integer: (x) => x.value.toString(),
        Text: (x) => `"${x.value}"`,
      }),
    ),
    required(
      renameIdents(),
      addVarDeclarations,
      groupVarDeclarations(),
      noStandaloneVarDeclarations,
      assertInt64,
      removeImplicitConversions,
    ),
  ],
  // Custom detokenizer reflects Swift's whitespace rules, namely binary ops needing equal amount of whitespace on both sides
  detokenizer: function (tokenTree: TokenTree): string {
    function isAlphaNum(s: string): boolean {
      return /[A-Za-z0-9]/.test(s);
    }

    // Tokens that need whitespace on both sides:
    //   A binary op followed by a unary op
    //   `!=`
    //   `&` followed by any of `*+-` (without space they are interpreted together as an overflow operator)
    function needsWhiteSpaceOnBothSides(
      token: string,
      nextToken: string,
    ): boolean {
      return (
        (/^[-+*%/<>=^*|~]+$/.test(token) && /[-~]/.test(nextToken[0])) ||
        (token === `&` && /[*+-]/.test(nextToken[0])) ||
        token === `!=`
      );
    }

    function needsWhiteSpace(prevToken: string, token: string): boolean {
      return (
        (isAlphaNum(prevToken[prevToken.length - 1]) && isAlphaNum(token[0])) ||
        ([`if`, `in`, `while`].includes(prevToken) && token[0] !== `(`) ||
        token[0] === `?` ||
        needsWhiteSpaceOnBothSides(prevToken, token)
      );
    }

    const tokens: string[] = flattenTree(tokenTree);

    let result = tokens[0];
    for (let i = 1; i < tokens.length; i++) {
      if (
        needsWhiteSpace(tokens[i - 1], tokens[i]) ||
        (i + 1 < tokens.length &&
          needsWhiteSpaceOnBothSides(tokens[i], tokens[i + 1]))
      )
        result += " ";
      result += tokens[i];
    }
    return result.trim();
  },
};

export default swiftLanguage;
