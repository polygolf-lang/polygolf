import { functionCall } from "../../IR";
import { defaultDetokenizer, Language } from "../../common/Language";

import emitProgram from "./emit";
import { requireBlockWhen } from "../../plugins/blocks";
import { divToTruncdiv, modToRem } from "../../plugins/divisionOps";
import { mapOps } from "../../plugins/ops";
import { addDependencies } from "../../plugins/dependecies";
import { addImports, addVarDeclarations, useUnsignedDivision } from "./plugins";
import { renameIdents } from "../../plugins/idents";
import { tempVarToMultipleAssignment } from "../../plugins/tempVariables";

const nimLanguage: Language = {
  name: "Nim",
  emitter: emitProgram,
  plugins: [
    tempVarToMultipleAssignment,
    modToRem,
    divToTruncdiv,
    requireBlockWhen(["Block"]),
    mapOps([
      ["str_length", (x, _) => functionCall("str_length", [x], "len")],
      ["int_to_str", "$"],
      ["repeat", (x, y) => functionCall("repeat", [x, y], "repeat")],
      ["add", "+"],
      ["sub", "-"],
      ["mul", "*"],
      ["truncdiv", "div"],
      ["exp", "^"],
      ["rem", "mod"],
      ["lt", "<"],
      ["leq", "<="],
      ["eq", "=="],
      ["geq", ">="],
      ["gt", ">"],
      ["and", "and"],
      ["or", "or"],
      ["not", ["not", 150]],
      ["str_concat", "&"],
      ["neg", ["-", 150]],
      ["str_to_int", (x, _) => functionCall("int_to_str", [x], "parseInt")],
    ]),
    useUnsignedDivision,
    addDependencies([
      ["^", "math"],
      ["repeat", "strutils"],
    ]),
    addImports,
    renameIdents(),
    addVarDeclarations,
  ],
  detokenizer: defaultDetokenizer(
    (a, b) =>
      (/[A-Za-z0-9_]/.test(a[a.length - 1]) && /[A-Za-z0-9_]/.test(b[0])) ||
      ("=+-*/<>@$~&%|!?^.:\\".includes(a[a.length - 1]) &&
        "=+-*/<>@$~&%|!?^.:\\".includes(b[0]))
  ),
};

export default nimLanguage;
