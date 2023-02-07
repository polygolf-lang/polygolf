import { assignment, functionCall, id, indexCall, methodCall } from "../../IR";
import { Language } from "../../common/Language";

import emitProgram from "./emit";
import { mapOps, mapPrecedenceOps, useIndexCalls } from "../../plugins/ops";
import { aliasBuiltins, renameIdents } from "../../plugins/idents";
import { tempVarToMultipleAssignment } from "../../plugins/tempVariables";
import { forRangeToForEach } from "../../plugins/loops";
import { evalStaticExpr, golfStringListLiteral } from "../../plugins/static";
import { golfLastPrint } from "../../plugins/print";

const swiftLanguage: Language = {
  name: "Swift",
  extension: "swift",
  emitter: emitProgram,
  golfPlugins: [
    golfStringListLiteral,
    evalStaticExpr,
    tempVarToMultipleAssignment,
    forRangeToForEach,
    golfLastPrint(),
  ],
  emitPlugins: [useIndexCalls()],
  finalEmitPlugins: [
    mapOps([
      ["text_get_byte", (x) => functionCall([indexCall(x[0], x[1])], "ord")],
      ["text_length", (x) => functionCall([x[0]], "len")],
      ["int_to_text", (x) => functionCall([x[0]], "str")],
      ["text_split", (x) => methodCall(x[0], [x[1]], "split")],
      ["text_split_whitespace", (x) => methodCall(x[0], [], "split")],
      ["text_to_int", (x) => functionCall([x[0]], "int")],
      ["println", (x) => functionCall([x[0]], "print")],
      [
        "print",
        (x) => functionCall([assignment(id("end", true), x[0])], "print"),
      ],
    ]),
    mapPrecedenceOps(
      [["pow", "**"]],
      [
        ["neg", "-"],
        ["bit_not", "~"],
      ],
      [
        ["mul", "*"],
        ["repeat", "*"],
        ["div", "//"],
        ["mod", "%"],
      ],
      [
        ["add", "+"],
        ["text_concat", "+"],
        ["sub", "-"],
      ],
      [["bit_and", "&"]],
      [["bit_xor", "^"]],
      [["bit_or", "|"]],
      [
        ["lt", "<"],
        ["leq", "<="],
        ["eq", "=="],
        ["neq", "!="],
        ["geq", ">="],
        ["gt", ">"],
      ],
      [["not", "not"]],
      [["and", "and"]],
      [["or", "or"]]
    ),
    aliasBuiltins(),
    renameIdents(),
  ],
};

export default swiftLanguage;
