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

const pythonLanguage: Language = {
  name: "Python",
  emitter: emitProgram,
  plugins: [
    tempVarToMultipleAssignment,
    golfStringListLiteral,
    forRangeToForEach,
    useIndexCalls(),
    golfLastPrint(),
    mapOps([
      ["text_get_byte", (x) => functionCall([indexCall(x[0], x[1])], "ord")],
      ["text_length", (x) => functionCall([x[0]], "len")],
      ["int_to_text", (x) => functionCall([x[0]], "str")],
      ["text_split", (x) => methodCall(x[0], [x[1]], "split")],
      ["text_split_whitespace", (x) => methodCall(x[0], [], "split")],
      ["repeat", "*"],
      ["add", "+"],
      ["sub", "-"],
      ["mul", "*"],
      ["div", "//"],
      ["pow", "**"],
      ["mod", "%"],
      ["bit_and", "&"],
      ["bit_or", "|"],
      ["bit_xor", "^"],
      ["bit_not", "~"],
      ["lt", "<"],
      ["leq", "<="],
      ["eq", "=="],
      ["neq", "!="],
      ["geq", ">="],
      ["gt", ">"],
      ["and", "and"],
      ["or", "or"],
      ["text_concat", ["+", 100]],
      ["not", ["not", 150]],
      ["neg", ["-", 150]],
      ["text_to_int", (x) => functionCall([x[0]], "int")],
      ["println", (x) => functionCall([x[0]], "print")],
      [
        "print",
        (x) => functionCall([assignment(id("end", true), x[0])], "print"),
      ],
    ]),
    evalStaticExpr,
    aliasBuiltins(),
    addDependencies([["sys", "sys"]]),
    renameIdents(),
  ],
};

export default pythonLanguage;
