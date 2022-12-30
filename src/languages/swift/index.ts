import { functionCall, id, indexCall, methodCall } from "../../IR";
import { Language } from "../../common/Language";

import emitProgram from "./emit";
import { mapOps, plus1, useIndexCalls } from "../../plugins/ops";
import { renameIdents } from "../../plugins/idents";
import { addDependencies } from "../../plugins/dependencies";
import { evalStaticExpr } from "../../plugins/static";
import { golfLastPrint } from "../../plugins/print";
import { addImports } from "./plugins";
import { addVarDeclarations } from "../nim/plugins";
import { addMutatingBinaryOp } from "../../plugins/binaryOps";

const swiftLanguage: Language = {
  name: "Swift",
  emitter: emitProgram,
  plugins: [
    addVarDeclarations,
    useIndexCalls(),
    golfLastPrint(),
    mapOps([
      ["not", ["!", 120]],
      ["neg", ["-", 120]],
      ["bit_not", ["~", 120]],

      ["mul", ["*", 110]],
      ["div", ["/", 110]],
      ["trunc_div", ["/", 110]],
      ["mod", ["%", 110]],
      ["bit_and", ["&", 110]],

      ["add", ["+", 100]],
      ["sub", ["-", 100]],
      ["bit_or", ["|", 100]],
      ["bit_xor", ["^", 100]],
      ["text_concat", ["+", 100]],

      ["lt", ["<", 40]],
      ["leq", ["<=", 40]],
      ["eq", ["==", 40]],
      ["neq", ["!=", 40]],
      ["geq", [">=", 40]],
      ["gt", [">", 40]],

      ["and", ["&&", 20]],

      ["or", ["||", 10]],

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
      [
        "argv_get",
        (x) =>
          indexCall(
            id("CommandLine.arguments", true),
            plus1(x[0]),
            "argv_get",
            true
          ),
      ],
      ["max", (x) => functionCall(x, "max")],
      ["min", (x) => functionCall(x, "min")],
      ["abs", (x) => functionCall([x[0]], "math.abs")],
      ["true", (_) => id("true", true)],
      ["false", (_) => id("false", true)],
    ]),
    evalStaticExpr,
    addDependencies([["pow", "Foundation"]]),
    addImports,
    renameIdents(),
    addMutatingBinaryOp("+", "-", "*", "/", "%", "&", "|", "^"),
  ],
};

export default swiftLanguage;
