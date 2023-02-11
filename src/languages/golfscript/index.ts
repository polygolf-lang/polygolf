import { functionCall, id, indexCall, methodCall,rangeIndexCall } from "../../IR";
import { defaultDetokenizer, Language } from "../../common/Language";
import { forRangeToForRangeInclusive } from "../../plugins/loops";

import emitProgram from "./emit";
import {
  mapOps,
  mapPrecedenceOps,
  plus1,
  useIndexCalls,
} from "../../plugins/ops";
import { renameIdents } from "../../plugins/idents";
import { tempVarToMultipleAssignment } from "../../plugins/tempVariables";
import { evalStaticExpr } from "../../plugins/static";
import { flipBinaryOps } from "../../plugins/binaryOps";
import { golfLastPrint } from "../../plugins/print";
import { addImports } from "./plugins";

const golfscriptLanguage: Language = {
  name: "Golfscript",
  extension: "txt", // Golfscript doesn't appear to have a custom extension
  emitter: emitProgram,
  golfPlugins: [
    flipBinaryOps,
    evalStaticExpr,
    golfLastPrint(),
   
  ],
  emitPlugins: [ useIndexCalls()],
  finalEmitPlugins: [
    mapOps([
      ["true", (_) => id("1", true)],
      ["false", (_) => id("0", true)],
      ["println", (x) => functionCall(x, "puts")],
      ["print", (x) => functionCall(x, "print")],

      [
        "text_get_slice",
        (x) => rangeIndexCall(x[0], x[1], plus1(x[2]), id("1", true)),
      ],
    ]),
    mapPrecedenceOps(
      [["not", "!"],
      ["bit_not", "~"],
      ["mul", "*"],
      ["div", "/"],
      ["trunc_div", "/"],
      ["mod", "%"],
      ["bit_and", "&"],
      ["add", "+"],
      ["sub", "-"],
      ["bit_or", "|"],
      ["bit_xor", "^"],
      ["text_concat", "+"],
      ["lt", "<"],
      ["eq", "="],
      ["gt", ">"],
      ["and", "and"],
      ["or", "or"],
      ["text_get_byte", "="],
      ["text_length", ","],
      ["int_to_text", "`"],
      ["text_split", "/"],
      ["repeat", "*"],
      ["pow", "?"],
      ["text_to_int", "~"],
      ["abs", "abs"],
      ["list_get", "="],
      ["list_push", "+"],
      ["list_length", ","],
      ["join_using", "*"],
      ["sorted", "$"],

      ["neg", "0-"],
      ["leq", ")<"],
      ["neq", "=!"],
      ["geq", "(>"],
      ["join", "''*"],
      ["text_reversed", "-1%"],
      ["text_get_char", "=[]+''+"],
      ["byte_to_char", "[]+''+"],
      ["max", "[]++$1="],
      ["min", "[]++$0="],

      ["argv_get", "a\\="],]
    ),
    addImports,
    renameIdents(),
    
  ],
  detokenizer: defaultDetokenizer(
    (a, b) =>
      a !== "" &&
      b !== "" &&
      ((/[A-Za-z0-9_]/.test(a[a.length - 1]) && /[A-Za-z0-9_]/.test(b[0])) ||
        (a[a.length - 1] === "-" && /[0-9]/.test(b[0])))
  ),
};

export default golfscriptLanguage;
