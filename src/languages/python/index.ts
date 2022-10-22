import { assignment, functionCall, id, indexCall } from "../../IR";
import { Language } from "../../common/Language";

import emitProgram from "./emit";
import { mapOps, useIndexCalls } from "../../plugins/ops";
import { renameIdents } from "../../plugins/idents";
import { tempVarToMultipleAssignment } from "../../plugins/tempVariables";
import { forRangeToForEach } from "../../plugins/loops";
import { addDependencies } from "../../plugins/dependencies";

const pythonLanguage: Language = {
  name: "Python",
  emitter: emitProgram,
  plugins: [
    tempVarToMultipleAssignment,
    forRangeToForEach,
    useIndexCalls(),
    mapOps([
      ["str_get_byte", (x) => functionCall([indexCall(x[0], x[1])], "ord")],
      ["str_length", (x) => functionCall([x[0]], "len")],
      ["int_to_str", (x) => functionCall([x[0]], "str")],
      ["repeat", "*"],
      ["add", "+"],
      ["sub", "-"],
      ["mul", "*"],
      ["div", "//"],
      ["exp", "**"],
      ["mod", "%"],
      ["lt", "<"],
      ["leq", "<="],
      ["eq", "=="],
      ["geq", ">="],
      ["gt", ">"],
      ["and", "and"],
      ["or", "or"],
      ["str_concat", ["+", 100]],
      ["not", ["not", 150]],
      ["neg", ["-", 150]],
      ["str_to_int", (x) => functionCall([x[0]], "int")],
      ["println", (x) => functionCall([x[0]], "print")],
      [
        "print",
        (x) => functionCall([assignment(id("end", true), x[0])], "print"),
      ],
    ]),
    addDependencies([["sys", "sys"]]),
    renameIdents(),
  ],
};

export default pythonLanguage;
