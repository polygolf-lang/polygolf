import { functionCall } from "../../IR";
import { defaultDetokenizer, Language } from "../../common/Language";

import emitProgram from "./emit";
import {
  lowerForRange,
  stringPrintlnToPrint,
  simplifyConcats,
  binarizeConcats,
  splitPrints,
  // simplifyConstantPrints,
  collectDeclarations,
  addDeclarations,
  // printStuff,
} from "./plugins";
import { addMutatingBinaryOp } from "../../plugins/binaryOps";
import { addDependencies } from "../../plugins/dependencies";
import { mapOps } from "../../plugins/ops";
import { evalStaticExpr } from "../../plugins/static";

const assemblyLanguage: Language = {
  name: "Assembly",
  emitter: emitProgram,
  plugins: [
    stringPrintlnToPrint,
    // printStuff,
    simplifyConcats,
    binarizeConcats,
    splitPrints,
    // not really useful if you ever print nonconstants
    // simplifyConstantPrints,
    lowerForRange,
    // printStuff,
    // flipBinaryOps,
    // tempVarToMultipleAssignment,
    // golfLastPrint(),
    mapOps([
      [
        "argv_get",
        (x) => functionCall([functionCall([], "argv"), x[0]], "load_rr8_q"),
      ],
      ["text_get_byte", (x) => functionCall(x, "load_rr_b")],
    //   ["text_get_slice", (x) => methodCall(x[0], [x[1], plus1(x[2])], "sub")],
    //   ["true", (_) => id("true", true)],
    //   ["false", (_) => id("false", true)],
    ]),
    mapOps([
      ["text_length", (x) => functionCall(x, "text_length")],
    //   ["int_to_text", (x) => functionCall(x, "tostring")],
      ["repeat", (x) => functionCall(x, "repeat")],
      ["print", (x) => functionCall(x, "print")],
      ["println", (x) => functionCall(x, "println")],
    //   ["min", (x) => functionCall(x, "math.min")],
    //   ["max", (x) => functionCall(x, "math.max")],
    //   ["abs", (x) => functionCall(x, "math.abs")],
      ["add", "add"],
      ["sub", "sub"],
      ["mul", "imul"],
      ["div", (x) => functionCall(x, "div")],
    //   ["pow", "^"],
      ["mod", (x) => functionCall(x, "mod")],
      ["bit_and", "and"],
      ["bit_or", "or"],
      ["bit_xor", "xor"],
      ["lt", (x) => functionCall(x, "lt")],
      ["leq", (x) => functionCall(x, "leq")],
      ["eq", (x) => functionCall(x, "eq")],
      ["geq", (x) => functionCall(x, "geq")],
      ["gt", (x) => functionCall(x, "gt")],
      ["neq", (x) => functionCall(x, "neq")],
      ["and", (x) => functionCall(x, "and")],
      ["or", (x) => functionCall(x, "or")],
      ["not", (x) => functionCall(x, "not")],
    //   ["text_concat", ".."],
      ["neg", "neg"],
      ["bit_not", "not"],
      ["text_to_int", (x) => functionCall(x, "text_to_int")],
    //   ["argv", (x) => id("argv", true)],
    //   ["min", (x) => functionCall(x, "math.min")],
    //   ["max", (x) => functionCall(x, "math.max")],
    //   ["abs", (x) => functionCall(x, "math.abs")],
      ["byte_to_char", (x) => functionCall(x, "load_r_b")],
      ["list_get", (x) => functionCall(x, "load_rr8_q")],
    ]),
    addMutatingBinaryOp,
    evalStaticExpr,
    // TODO: addDependencies isn't really the right thing
    // to use for this
    addDependencies([
      ["text_length", "text_length"],
      ["print", "print"],
      ["print_length", "print_length"],
      ["println", "println"],
      ["repeat", "repeat"],
      ["text_to_int", "text_to_int"],
    ]),
    addDependencies([
      ["print", "text_length"],
      ["repeat", "text_length"],
    ]),
    collectDeclarations,
    addDeclarations,
    // printStuff,
  ],
  detokenizer: defaultDetokenizer(
    (a, b) =>
      a !== "" &&
      b !== "" &&
      (/[A-Za-z0-9_$]/.test(a[a.length - 1]) && /[A-Za-z0-9_$]/.test(b[0]))
  ),
};

export default assemblyLanguage;
