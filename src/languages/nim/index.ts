import { functionCall } from "../../IR";
import { Language, OpTransformOutput } from "../../common/Language";

import emitProgram from "./emit";
import { requireBlockWhen } from "../../plugins/blocks";
import { divToTruncdiv, modToRem } from "../../plugins/divisionOps";
import { mapOps } from "../../plugins/ops";
import { addDependencies } from "../../plugins/dependecies";
import { addImports } from "./plugins";

const nimLanguage: Language = {
  name: "Nim",
  emitter: emitProgram,
  plugins: [
    modToRem,
    divToTruncdiv,
    requireBlockWhen(["Block"]),
    mapOps(
      new Map<string, OpTransformOutput>([
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
      ])
    ),
    addDependencies(
      new Map<string, string>([
        ["^", "math"],
        ["repeat", "strutils"],
      ])
    ),
    addImports,
  ],
};

export default nimLanguage;
