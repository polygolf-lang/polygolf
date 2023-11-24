import {
  functionCall as func,
  indexCall,
  methodCall as method,
  namedArg,
  op,
  text,
  add1,
  propertyCall as prop,
  isText,
  builtin,
  int,
  postfix,
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
  mapOps,
  mapToPrefixAndInfix,
  useIndexCalls,
  flipBinaryOps,
  removeImplicitConversions,
  printIntToPrint,
} from "../../plugins/ops";
import { alias, renameIdents } from "../../plugins/idents";
import {
  golfStringListLiteral,
  hardcode,
  listOpsToTextOps,
} from "../../plugins/static";
import { golfLastPrint, implicitlyConvertPrintArg } from "../../plugins/print";
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
  useEquivalentTextOp,
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
    required(printIntToPrint),
    simplegolf(golfLastPrint()),
    search(
      flipBinaryOps,
      golfStringListLiteral(false),
      listOpsToTextOps(),
      equalityToInequality,
      forRangeToForRangeInclusive(),
      ...bitnotPlugins,
      ...lowBitsPlugins,
      applyDeMorgans,
      forRangeToForRangeOneStep,
      useEquivalentTextOp(true, true),
      inlineVariables,
      replaceToSplitAndJoin,
      textToIntToTextGetToInt,
      forArgvToForEach,
      ...truncatingOpsPlugins,
      mapOps({
        argv: builtin("CommandLine.arguments[1...]"),
        argv_get: (x) =>
          op("list_get", builtin("CommandLine.arguments"), add1(x[0])),
        codepoint_to_int: (x) => op("text_get_codepoint_to_int", x[0], int(0n)),
        text_byte_to_int: (x) => op("text_get_byte_to_int", x[0], int(0n)),
        text_get_byte: (x) =>
          op("int_to_text_byte", op("text_get_byte_to_int", ...x)),
      }),
      useIndexCalls(),
      decomposeIntLiteral(),
    ),
    required(
      pickAnyInt,
      forArgvToForEach,
      ...truncatingOpsPlugins,
      mapOps({
        read_line: func("readLine"),
        argv: builtin("CommandLine.arguments[1...]"),
        argv_get: (x) =>
          op("list_get", builtin("CommandLine.arguments"), add1(x[0])),
        codepoint_to_int: (x) => op("text_get_codepoint_to_int", x[0], int(0n)),
        text_byte_to_int: (x) => op("text_get_byte_to_int", x[0], int(0n)),
        text_get_byte: (x) =>
          op("int_to_text_byte", op("text_get_byte_to_int", ...x)),
      }),
      useIndexCalls(),
      implicitlyConvertPrintArg,
      mapOps({
        join: (x) =>
          method(
            x[0],
            "joined",
            ...(isText("")(x[1]) ? [] : [namedArg("separator", x[1])]),
          ),
        text_get_byte_to_int: (x) =>
          func("Int", indexCall(func("Array", prop(x[0], "utf8")), x[1])),
        text_get_codepoint: (x) =>
          func("String", indexCall(func("Array", x[0]), x[1])),
        text_get_codepoint_to_int: (x) =>
          prop(
            indexCall(func("Array", prop(x[0], "unicodeScalars")), x[1]),
            "value",
          ),
        int_to_text_byte: (x) =>
          func("String", postfix("!", func("UnicodeScalar", x))),
        int_to_codepoint: (x) =>
          func("String", postfix("!", func("UnicodeScalar", x))),
        text_codepoint_length: (x) => prop(x[0], "count"),
        text_byte_length: (x) => prop(prop(x[0], "utf8"), "count"),
        int_to_text: (x) => func("String", x),
        text_split: (x) => method(x[0], "split", namedArg("separator", x[1])),
        repeat: (x) =>
          func("String", namedArg("repeating", x[0]), namedArg("count", x[1])),

        pow: (x) =>
          func("Int", func("pow", func("Double", x[0]), func("Double", x[1]))),
        println: (x) => func("print", x),
        print: (x) => func("print", x, namedArg("terminator", text(""))),
        text_to_int: (x) => postfix("!", func("Int", x)),

        max: (x) => func("max", x),
        min: (x) => func("min", x),
        abs: (x) => func("abs", x),
        true: builtin("true"),
        false: builtin("false"),

        text_replace: (x) =>
          method(
            x[0],
            "replacingOccurrences",
            namedArg("of", x[1]),
            namedArg("with", x[2]),
          ),
      }),
      mapToPrefixAndInfix(
        {
          not: "!",
          neg: "-",
          bit_not: "~",
          bit_shift_left: "<<",
          bit_shift_right: ">>",
          mul: "*",
          trunc_div: "/",
          rem: "%",
          bit_and: "&",
          add: "+",
          sub: "-",
          bit_or: "|",
          bit_xor: "^",
          concat: "+",
          lt: "<",
          leq: "<=",
          eq: "==",
          neq: "!=",
          geq: ">=",
          gt: ">",
          and: "&&",
          or: "||",
        },
        ["+", "-", "*", "/", "%", "&", "|", "^", "<<", ">>"],
      ),
      addImports({ pow: "Foundation", replacingOccurrences: "Foundation" }),
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
        (/^[-+*/<>=^*|~]+$/.test(token) && /[-~]/.test(nextToken[0])) ||
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
