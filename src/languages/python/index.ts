import { functionCall } from "../../IR";
import { defaultDetokenizer, Language } from "../../common/Language";

import emitProgram from "./emit";
import { mapOps } from "../../plugins/ops";
import { addDependencies } from "../../plugins/dependencies";
import { renameIdents } from "../../plugins/idents";
import { tempVarToMultipleAssignment } from "../../plugins/tempVariables";

const pythonLanguage: Language = {
  name: "Nim",
  emitter: emitProgram,
  plugins: [
    tempVarToMultipleAssignment,
    mapOps([
      ["str_length", (x, _) => functionCall("str_length", [x], "len")],
      ["int_to_str", (x, _) => functionCall("int_to_str", [x], "str")],
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
      ["str_to_int", (x, _) => functionCall("int_to_str", [x], "int")],
    ]),
    addDependencies([
      ["sys", "sys"],
    ]),
    renameIdents()
  ],
  detokenizer: defaultDetokenizer()
};

export default pythonLanguage;
