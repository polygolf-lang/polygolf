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
      ["text_get_byte", (x) => functionCall([indexCall(functionCall([methodCall(x[0], [], "utf8")], "Array"), x[1])], "Int")],
      ["text_length", (x) => methodCall(x[0], [], "count")],
      //["text_length_chars", (x) => methodCall(x[0], [], "count")],
      //["text_length_bytes", (x) => methodCall(methodCall(x[0], [], "utf8"), [], "count")]
      ["int_to_text", (x) => functionCall([x[0]], "String")],
      ["text_split", (x) => methodCall(x[0], [x[1]], "split")],
      ["repeat", (x) => functionCall([x[0], x[1]], "String")],
      ["pow", (x) => functionCall([functionCall([functionCall([x[0]], "Double"), functionCall([x[1]], "Double")], "pow")], "Int")],
      ["println", (x) => functionCall([x[0]], "print")],
      ["print", (x) => functionCall([x[0]], "print")],

      ["add",         ["+", 100]],
      
      ["sub",         ["-", 100]],
      ["mul",         ["*", 100]],
      ["div",         ["/", 100]],
      ["trunc_div",   ["/", 100]],
      
      ["mod",         ["%", 100]],
      ["bit_and",     ["&", 100]],
      ["bit_or",      ["|", 100]],
      ["bit_xor",     ["^", 100]],
      ["bit_not",     ["~", 100]],
      ["lt",          ["<", 100]],
      ["leq",         ["<=", 100]],
      ["eq",          ["==", 100]],
      ["neq",         ["!=", 100]],
      ["geq",         [">=", 100]],
      ["gt",          [">", 100]],
      ["and",         ["&&", 100]],
      ["or",          ["||", 100]],
      ["text_concat", ["+", 100]],
      ["not",         ["!", 100]],
      ["neg",         ["-", 100]], 
      
    ]),
    evalStaticExpr,
    addDependencies([["pow", "Foundation"]]),
    addImports,
    renameIdents(),
  ],
};

export default swiftLanguage;
