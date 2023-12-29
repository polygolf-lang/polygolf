import {
  functionCall as func,
  indexCall,
  methodCall as method,
  namedArg,
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
import {
  golfStringListLiteral,
  hardcode,
  listOpsToTextOps,
} from "../../plugins/static";
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
    search(hardcode()),
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
        argv: builtin("CommandLine.arguments[1...]"),
        "at[argv]": (x) =>
          op["at[List]"](builtin("CommandLine.arguments"), succ(x[0])),
        "ord[codepoint]": (x) => op["ord_at[codepoint]"](x[0], int(0n)),
        "ord[byte]": (x) => op["ord_at[byte]"](x[0], int(0n)),
        "at[byte]": (x) => op["char[byte]"](op["ord_at[byte]"](x[0], x[1])),
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
        "read[line]": func("readLine"),
        argv: builtin("CommandLine.arguments[1...]"),
        "at[argv]": (x) =>
          op["at[List]"](builtin("CommandLine.arguments"), succ(x[0])),
        "ord[codepoint]": (x) => op["ord_at[codepoint]"](x[0], int(0n)),
        "ord[byte]": (x) => op["ord_at[byte]"](x[0], int(0n)),
        "at[byte]": (x) => op["char[byte]"](op["ord_at[byte]"](x[0], x[1])),
      }),
      implicitlyConvertPrintArg,
      mapOps({
        join: (x) =>
          method(
            x[0],
            "joined",
            ...(isText("")(x[1]) ? [] : [namedArg("separator", x[1])]),
          ),
        "ord_at[byte]": (x) =>
          func("Int", indexCall(func("Array", prop(x[0], "utf8")), x[1])),
        "at[codepoint]": (x) =>
          func("String", indexCall(func("Array", x[0]), x[1])),
        "slice[codepoint]": (x) =>
          isInt(0n)(x[1])
            ? method(x[0], "prefix", x[2])
            : method(
                method(x[0], "prefix", op.add(x[1], x[2])),
                "suffix",
                x[2],
              ),
        "slice[List]": (x) =>
          rangeIndexCall(x[0], x[1], op.add(x[1], x[2]), int(1n)),
        "ord_at[codepoint]": (x) =>
          prop(
            indexCall(func("Array", prop(x[0], "unicodeScalars")), x[1]),
            "value",
          ),
        "char[byte]": (x) =>
          func("String", postfix("!", func("UnicodeScalar", x))),
        "char[codepoint]": (x) =>
          func("String", postfix("!", func("UnicodeScalar", x))),
        "size[codepoint]": (x) => prop(x[0], "count"),
        "size[byte]": (x) => prop(prop(x[0], "utf8"), "count"),
        "size[List]": (x) => prop(x[0], "count"),
        "size[Set]": (x) => prop(x[0], "count"),
        "size[Table]": (x) => prop(x[0], "count"),
        "reversed[codepoint]": (x) => func("String", method(x[0], "reversed")),
        "reversed[List]": (x) => func("Array", method(x[0], "reversed")),
        "sorted[Int]": (x) => method(x[0], "sorted"),
        "sorted[Ascii]": (x) => method(x[0], "sorted"),
        int_to_dec: (x) => func("String", x),
        split: (x) =>
          method(
            x[0],
            "split",
            namedArg("separator", x[1]),
            namedArg("omittingEmptySubsequences", op.false),
          ),
        repeat: (x) =>
          func("String", namedArg("repeating", x[0]), namedArg("count", x[1])),
        "contains[Text]": (x) => method(x[0], "contains", x[1]),
        "contains[List]": (x) => method(x[0], "contains", x[1]),
        "contains[Set]": (x) => method(x[0], "contains", x[1]),
        "contains[Table]": (x) => method(prop(x[0], "keys"), "contains", x[1]),
        "find[List]": (x) => method(x[0], "index", namedArg("of", x[1])),
        "find[codepoint]": (x) =>
          conditional(
            op["contains[Text]"](x[0], x[1]),
            op["size[codepoint]"](
              op["at[List]"](op.split(x[0], x[1]), int(0n)),
            ),
            int(-1n),
          ),
        "find[byte]": (x) =>
          conditional(
            op["contains[Text]"](x[0], x[1]),
            op["size[byte]"](op["at[List]"](op.split(x[0], x[1]), int(0n))),
            int(-1n),
          ),
        pow: (x) =>
          func("Int", func("pow", func("Double", x[0]), func("Double", x[1]))),
        "println[Text]": (x) => func("print", x),
        "print[Text]": (x) =>
          func("print", x, namedArg("terminator", text(""))),
        dec_to_int: (x) => postfix("!", func("Int", x)),
        append: (x) => op["concat[List]"](x[0], list([x[1]])),
        include: (x) => method(x[0], "insert", x[1]),
        bool_to_int: (x) => conditional(x[0], int(1n), int(0n)),
        int_to_bool: (x) => op["neq[Int]"](x[0], int(0n)),
        int_to_hex: (x) =>
          func(
            "String",
            x[0],
            namedArg("radix", int(16n)),
            namedArg("uppercase", op.true),
          ),
        int_to_bin: (x) => func("String", x[0], namedArg("radix", int(2n))),
        int_to_hex_aligned: (x) =>
          func(
            "String",
            namedArg(
              "format",
              op["concat[Text]"](text("%0"), op.int_to_dec(x[1]), text("X")),
            ),
            x[0],
          ),
        int_to_bin_aligned: (x) =>
          method(
            op["concat[Text]"](op.repeat(text("0"), x[1]), op.int_to_bin(x[0])),
            "suffix",
            x[1],
          ),
        right_align: (x) =>
          method(
            op["concat[Text]"](op.repeat(text(" "), x[1]), x[0]),
            "suffix",
            x[1],
          ),

        replace: (x) =>
          method(
            x[0],
            "replacingOccurrences",
            namedArg("of", x[1]),
            namedArg("with", x[2]),
          ),
        starts_with: (x) => method(x[0], "hasPrefix", x[1]),
        ends_with: (x) => method(x[0], "hasSuffix", x[1]),
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
