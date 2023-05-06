import {
  functionCall,
  id,
  indexCall,
  methodCall,
  namedArg,
  polygolfOp,
  stringLiteral,
  add1,
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
import { renameIdents } from "../../plugins/idents";
import { golfStringListLiteral, listOpsToTextOps } from "../../plugins/static";
import { golfLastPrint, implicitlyConvertPrintArg } from "../../plugins/print";
import { assertInt64 } from "../../plugins/types";
import {
  addVarDeclarations,
  groupVarDeclarations,
  noStandaloneVarDeclarations,
} from "../../plugins/block";
import {
  forArgvToForEach,
  forRangeToForRangeInclusive,
} from "../../plugins/loops";
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
    forRangeToForRangeInclusive,
    ...bitnotPlugins,
    applyDeMorgans,
  ],
  emitPlugins: [
    forArgvToForEach,
    ...truncatingOpsPlugins,
    mapOps([
      ["argv", (x) => id("CommandLine.arguments[1...]", true)],
      [
        "argv_get",
        (x) =>
          polygolfOp("list_get", id("CommandLine.arguments", true), add1(x[0])),
      ],
    ]),
    useIndexCalls(),
  ],
  finalEmitPlugins: [
    implicitlyConvertPrintArg,
    mapOps([
      [
        "text_get_byte",
        (x) =>
          functionCall(
            [
              indexCall(
                functionCall([methodCall(x[0], [], "utf8", true)], "Array"),
                x[1]
              ),
            ],
            "Int"
          ),
      ],
      [
        "text_get_codepoint",
        (x) =>
          functionCall(
            [indexCall(functionCall([x[0]], "Array"), x[1])],
            "String"
          ),
      ],
      [
        "int_to_codepoint",
        (x) =>
          functionCall(
            [functionCall([functionCall([x[0]], "UnicodeScalar")], "!")],
            "String"
          ),
      ],
      ["text_codepoint_length", (x) => methodCall(x[0], [], "count", true)],
      [
        "text_byte_length",
        (x) =>
          methodCall(methodCall(x[0], [], "utf8", true), [], "count", true),
      ],
      ["int_to_text", (x) => functionCall([x[0]], "String")],
      [
        "text_split",
        (x) => methodCall(x[0], [namedArg("separator", x[1])], "split"),
      ],
      [
        "repeat",
        (x) =>
          functionCall(
            [namedArg("repeating", x[0]), namedArg("count", x[1])],
            "String"
          ),
      ],
      [
        "pow",
        (x) =>
          functionCall(
            [
              functionCall(
                [
                  functionCall([x[0]], "Double"),
                  functionCall([x[1]], "Double"),
                ],
                "pow"
              ),
            ],
            "Int"
          ),
      ],
      ["println", (x) => functionCall([x[0]], "print")],
      [
        "print",
        (x) =>
          functionCall(
            [x[0], namedArg("terminator", stringLiteral(""))],
            "print"
          ),
      ],
      ["text_to_int", (x) => functionCall([functionCall([x[0]], "Int")], "!")],

      ["max", (x) => functionCall(x, "max")],
      ["min", (x) => functionCall(x, "min")],
      ["abs", (x) => functionCall([x[0]], "abs")],
      ["true", (_) => id("true", true)],
      ["false", (_) => id("false", true)],
    ]),
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
    addImports([["pow", "Foundation"]], "import"),
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
