import { functionCall, id, indexCall, methodCall, polygolfOp } from "../../IR";
import { Language, TokenTree, flattenTree } from "../../common/Language";

import emitProgram from "./emit";
import {
  add1,
  mapOps,
  mapPrecedenceOps,
  useIndexCalls,
  equalityToInequality,
} from "../../plugins/ops";
import { divToTruncdiv, modToRem } from "../../plugins/divisionOps";
import { addImports } from "./plugins";
import { renameIdents } from "../../plugins/idents";
import { evalStaticExpr, golfStringListLiteral } from "../../plugins/static";
import { addMutatingBinaryOp, flipBinaryOps } from "../../plugins/binaryOps";
import { golfLastPrint } from "../../plugins/print";
import { assertInt64 } from "../../plugins/types";
import { addVarDeclarations, groupVarDeclarations } from "../../plugins/block";
import {
  forArgvToForEach,
  forRangeToForRangeInclusive,
} from "../../plugins/loops";

const swiftLanguage: Language = {
  name: "Swift",
  extension: "swift",
  emitter: emitProgram,
  golfPlugins: [
    flipBinaryOps,
    golfStringListLiteral(false),
    evalStaticExpr,
    golfLastPrint(),
    equalityToInequality,
    forRangeToForRangeInclusive,
  ],
  emitPlugins: [
    forArgvToForEach,
    modToRem,
    divToTruncdiv,
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
    mapOps([
      [
        "text_get_byte",
        (x) =>
          functionCall(
            [
              indexCall(
                functionCall(
                  [methodCall(x[0], [], "utf8", undefined, true)],
                  "Array"
                ),
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
        (x) => functionCall([functionCall([x[0]], "UnicodeScalar")], "String"),
      ],
      [
        "text_codepoint_length",
        (x) => methodCall(x[0], [], "count", undefined, true),
      ],
      [
        "text_byte_length",
        (x) =>
          methodCall(
            methodCall(x[0], [], "utf8", undefined, true),
            [],
            "count",
            undefined,
            true
          ),
      ],
      ["int_to_text", (x) => functionCall([x[0]], "String")],
      ["text_split", (x) => methodCall(x[0], [x[1]], "split")],
      ["repeat", (x) => functionCall([x[0], x[1]], "String")],
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
      ["print", (x) => functionCall([x[0]], "print")],
      ["text_to_int", (x) => functionCall([x[0]], "Int")],

      ["max", (x) => functionCall(x, "max")],
      ["min", (x) => functionCall(x, "min")],
      ["abs", (x) => functionCall([x[0]], "abs")],
      ["true", (_) => id("true", true)],
      ["false", (_) => id("false", true)],
    ]),
    mapPrecedenceOps(
      [
        ["not", "!"],
        ["neg", "-"],
        ["bit_not", "~"],
      ],

      [
        ["bit_shift_left", "<<"],
        ["bit_shift_right", ">>"],
      ],

      [
        ["mul", "*"],
        ["trunc_div", "/"],
        ["rem", "%"],
        ["bit_and", "&"],
      ],

      [
        ["add", "+"],
        ["sub", "-"],
        ["bit_or", "|"],
        ["bit_xor", "^"],
        ["concat", "+"],
      ],

      [
        ["lt", "<"],
        ["leq", "<="],
        ["eq", "=="],
        ["neq", "!="],
        ["geq", ">="],
        ["gt", ">"],
      ],

      [["and", "&&"]],

      [["or", "||"]]
    ),

    addMutatingBinaryOp("+", "-", "*", "/", "%", "&", "|", "^", ">>", "<<"),

    addImports,
    renameIdents(),
    addVarDeclarations,
    groupVarDeclarations(),
    assertInt64,
  ],
  // Custom detokenizer reflects Swift's whitespace rules, namely binary ops needing equal amount of whitespace on both sides
  detokenizer: function (tokenTree: TokenTree): string {
    function isAlphaNum(s: string): boolean {
      return /[A-Za-z0-9]/.test(s);
    }

    // A binary op followed by a unary op needs whitespace on both sides, and `!=` always needs it
    function needsWhiteSpaceOnBothSides(
      token: string,
      nextToken: string
    ): boolean {
      return (
        (/^[-+*/<>=^*|~]+$/.test(token) && /[-~]/.test(nextToken[0])) ||
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
