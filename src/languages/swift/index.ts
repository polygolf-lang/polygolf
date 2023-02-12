import {
  functionCall,
  id,
  indexCall,
  methodCall,
  int,
  polygolfOp,
} from "../../IR";
import { Language } from "../../common/Language";

import emitProgram from "./emit";
import { mapOps, mapPrecedenceOps, useIndexCalls } from "../../plugins/ops";
import { addVarDeclarations } from "../nim/plugins";

import { addImports } from "./plugins";
import { renameIdents } from "../../plugins/idents";
import { evalStaticExpr, golfStringListLiteral } from "../../plugins/static";
import { addMutatingBinaryOp, flipBinaryOps } from "../../plugins/binaryOps";
import { golfLastPrint } from "../../plugins/print";

const swiftLanguage: Language = {
  name: "Swift",
  extension: "swift",
  emitter: emitProgram,
  golfPlugins: [
    flipBinaryOps,
    golfStringListLiteral(false),
    evalStaticExpr,
    golfLastPrint(),
  ],
  emitPlugins: [useIndexCalls()],
  finalEmitPlugins: [
    mapOps([
      [
        "argv_get",
        (x) =>
          indexCall(
            id("CommandLine.arguments", true),
            polygolfOp("add", x[0], int(1n)),
            "argv_get",
            true
          ),
      ],
    ]),
    mapOps([
      [
        "text_get_byte",
        (x) =>
          functionCall(
            [
              indexCall(
                functionCall([methodCall(x[0], [], "utf8")], "Array"),
                x[1]
              ),
            ],
            "Int"
          ),
      ],
      [
        "text_get_char",
        (x) =>
          functionCall(
            [indexCall(functionCall([x[0]], "Array"), x[1])],
            "String"
          ),
      ],
      [
        "byte_to_char",
        (x) => functionCall([functionCall([x[0]], "UnicodeScalar")], "String"),
      ],
      ["text_length", (x) => methodCall(x[0], [], "count")],
      // ["text_length_chars", (x) => methodCall(x[0], [], "count")],
      // ["text_length_bytes", (x) => methodCall(methodCall(x[0], [], "utf8"), [], "count")]
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
        ["mul", "*"],
        ["div", "/"],
        ["trunc_div", "/"],
        ["mod", "%"],
        ["rem", "%"],
        ["bit_and", "&"],
      ],

      [
        ["add", "+"],
        ["sub", "-"],
        ["bit_or", "|"],
        ["bit_xor", "^"],
        ["text_concat", "+"],
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

    addMutatingBinaryOp("+", "-", "*", "/", "%", "&", "|", "^"),

    addImports,
    renameIdents(),
    addVarDeclarations,
  ],
};

export default swiftLanguage;
