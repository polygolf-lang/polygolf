import { assignment, functionCall, id, indexCall, methodCall } from "../../IR";
import { Language } from "../../common/Language";

import emitProgram from "./emit";
import { mapOps, useIndexCalls } from "../../plugins/ops";
import { aliasBuiltins, renameIdents } from "../../plugins/idents";
import { tempVarToMultipleAssignment } from "../../plugins/tempVariables";
import { forRangeToForEach } from "../../plugins/loops";
import { addDependencies } from "../../plugins/dependencies";
import { evalStaticExpr, golfStringListLiteral } from "../../plugins/static";
import { golfLastPrint } from "../../plugins/print";
import { addImports } from "./plugins";

const swiftLanguage: Language = {
  name: "Swift",
  emitter: emitProgram,
  plugins: [
    tempVarToMultipleAssignment,
    golfStringListLiteral,
    forRangeToForEach,
    useIndexCalls(),
    golfLastPrint(),
    mapOps([
      ["text_get_byte", (x) => functionCall([indexCall(functionCall([methodCall(x[0], [], "utf8", undefined, true)], "Array"), x[1])], "Int")],
      ["text_length", (x) => methodCall(x[0], [], "count", undefined, true)],
      //["text_length_chars", (x) => methodCall(x[0], [], "count", undefined, true)],
      //["text_length_bytes", (x) => methodCall(methodCall(x[0], [], "utf8", undefined, true), [], "count", undefined, true)]
      ["int_to_text", (x) => functionCall([x[0]], "String")],
      ["text_split", (x) => methodCall(x[0], [x[1]], "split")],
      //["text_split_whitespace", ""],
      ["repeat",      ["_", 100]],
      ["add",         ["+", 100]],
      ["sub",         ["_", 100]],
      ["mul",         ["_", 100]],
      ["div",         ["_", 100]],
      ["pow",         ["_", 100]],
      ["mod",         ["_", 100]],
      ["bit_and",     ["_", 100]],
      ["bit_or",      ["_", 100]],
      ["bit_xor",     ["_", 100]],
      ["bit_not",     ["_", 100]],
      ["lt",          ["_", 100]],
      ["leq",         ["_", 100]],
      ["eq",          ["_", 100]],
      ["neq",         ["_", 100]],
      ["geq",         ["_", 100]],
      ["gt",          ["_", 100]],
      ["and",         ["_", 100]],
      ["or",          ["_", 100]],
      ["text_concat", ["_", 100]],
      ["not",         ["_", 100]],
      ["neg",         ["_", 100]], 
      ["text_to_int", (x) => functionCall([x[0]], "int")],
      ["println", (x) => functionCall([x[0]], "print")],
      [
        "print",
        (x) => functionCall([assignment(id("end", true), x[0])], "print"),
      ],
    ]),
    evalStaticExpr,
    addDependencies([["+", "Foundation"]]),
    addImports,
    renameIdents(),
  ],
};

export default swiftLanguage;
