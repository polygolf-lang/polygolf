import {
  functionCall,
  indexCall,
  methodCall,
  namedArg,
  polygolfOp,
  text,
  add1,
  propertyCall,
  isTextLiteral,
  builtin,
  int,
} from "../../IR";
import { Language, TokenTree, flattenTree } from "../../common/Language";

import emitProgram from "./emit";
import {
  mapOps,
  mapToUnaryAndBinaryOps,
  useIndexCalls,
  addMutatingBinaryOp,
  flipBinaryOps,
  removeImplicitConversions,
} from "../../plugins/ops";
import { alias, renameIdents } from "../../plugins/idents";
import { golfStringListLiteral, listOpsToTextOps } from "../../plugins/static";
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
} from "../../plugins/arithmetic";

const swiftLanguage: Language = {
  name: "Swift",
  extension: "swift",
  emitter: emitProgram,
  golfPlugins: [
    flipBinaryOps,
    golfStringListLiteral(false),
    listOpsToTextOps(),
    golfLastPrint(),
    equalityToInequality,
    forRangeToForRangeInclusive(),
    ...bitnotPlugins,
    applyDeMorgans,
    forRangeToForRangeOneStep,
    useEquivalentTextOp(true, true),
    inlineVariables,
    replaceToSplitAndJoin,
    textToIntToTextGetToInt,
  ],
  emitPlugins: [
    forArgvToForEach,
    ...truncatingOpsPlugins,
    mapOps(
      ["argv", builtin("CommandLine.arguments[1...]")],
      [
        "argv_get",
        (x) =>
          polygolfOp("list_get", builtin("CommandLine.arguments"), add1(x[0])),
      ],
      [
        "codepoint_to_int",
        (x) => polygolfOp("text_get_codepoint_to_int", x[0], int(0n)),
      ],
      [
        "text_byte_to_int",
        (x) => polygolfOp("text_get_byte_to_int", x[0], int(0n)),
      ],
      [
        "text_get_byte",
        (x) =>
          polygolfOp(
            "int_to_text_byte",
            polygolfOp("text_get_byte_to_int", ...x)
          ),
      ]
    ),
    useIndexCalls(),
  ],
  finalEmitPlugins: [
    implicitlyConvertPrintArg,
    mapOps(
      ["read_line", () => functionCall("readLine")],
      [
        "join",
        (x) =>
          methodCall(
            x[0],
            "joined",
            ...(isTextLiteral(x[1], "") ? [] : [namedArg("separator", x[1])])
          ),
      ],
      [
        "text_get_byte_to_int",
        (x) =>
          functionCall(
            "Int",
            indexCall(functionCall("Array", propertyCall(x[0], "utf8")), x[1])
          ),
      ],
      [
        "text_get_codepoint",
        (x) =>
          functionCall("String", indexCall(functionCall("Array", x[0]), x[1])),
      ],
      [
        "text_get_codepoint_to_int",
        (x) =>
          propertyCall(
            indexCall(
              functionCall("Array", propertyCall(x[0], "unicodeScalars")),
              x[1]
            ),
            "value"
          ),
      ],
      [
        "int_to_text_byte",
        (x) =>
          functionCall(
            "String",
            functionCall("!", functionCall("UnicodeScalar", x))
          ),
      ],
      [
        "int_to_codepoint",
        (x) =>
          functionCall(
            "String",
            functionCall("!", functionCall("UnicodeScalar", x))
          ),
      ],
      ["text_codepoint_length", (x) => propertyCall(x[0], "count")],
      [
        "text_byte_length",
        (x) => propertyCall(propertyCall(x[0], "utf8"), "count"),
      ],
      ["int_to_text", (x) => functionCall("String", x)],
      [
        "text_split",
        (x) => methodCall(x[0], "split", namedArg("separator", x[1])),
      ],
      [
        "repeat",
        (x) =>
          functionCall(
            "String",
            namedArg("repeating", x[0]),
            namedArg("count", x[1])
          ),
      ],
      [
        "pow",
        (x) =>
          functionCall(
            "Int",
            functionCall(
              "pow",
              functionCall("Double", x[0]),
              functionCall("Double", x[1])
            )
          ),
      ],
      ["println", (x) => functionCall("print", x)],
      [
        "print",
        (x) => functionCall("print", x, namedArg("terminator", text(""))),
      ],
      ["text_to_int", (x) => functionCall("!", functionCall("Int", x))],

      ["max", (x) => functionCall("max", x)],
      ["min", (x) => functionCall("min", x)],
      ["abs", (x) => functionCall("abs", x)],
      ["true", builtin("true")],
      ["false", builtin("false")],
      [
        "text_replace",
        (x) =>
          methodCall(
            x[0],
            "replacingOccurrences",
            namedArg("of", x[1]),
            namedArg("with", x[2])
          ),
      ]
    ),
    addMutatingBinaryOp(
      ["add", "+"],
      ["sub", "-"],
      ["mul", "*"],
      ["trunc_div", "/"],
      ["rem", "%"],
      ["bit_and", "&"],
      ["bit_or", "|"],
      ["bit_xor", "^"],
      ["bit_shift_left", "<<"],
      ["bit_shift_right", ">>"]
    ),
    mapToUnaryAndBinaryOps(
      ["not", "!"],
      ["neg", "-"],
      ["bit_not", "~"],
      ["bit_shift_left", "<<"],
      ["bit_shift_right", ">>"],
      ["mul", "*"],
      ["trunc_div", "/"],
      ["rem", "%"],
      ["bit_and", "&"],
      ["add", "+"],
      ["sub", "-"],
      ["bit_or", "|"],
      ["bit_xor", "^"],
      ["concat", "+"],
      ["lt", "<"],
      ["leq", "<="],
      ["eq", "=="],
      ["neq", "!="],
      ["geq", ">="],
      ["gt", ">"],
      ["and", "&&"],
      ["or", "||"]
    ),
    addImports(
      [
        ["pow", "Foundation"],
        ["replacingOccurrences", "Foundation"],
      ],
      "import"
    ),
    alias((expr) => {
      switch (expr.kind) {
        case "IntegerLiteral":
          return expr.value.toString();
        case "TextLiteral":
          return `"${expr.value}"`;
      }
    }),
    renameIdents(),
    addVarDeclarations,
    groupVarDeclarations(),
    noStandaloneVarDeclarations,
    assertInt64,
    removeImplicitConversions,
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
      nextToken: string
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
