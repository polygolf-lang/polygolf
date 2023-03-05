import { functionCall, id, rangeIndexCall } from "../../IR";
import { defaultDetokenizer, Language } from "../../common/Language";

import emitProgram from "./emit";
import {
  equalityToInequality,
  mapOps,
  mapPrecedenceOps,
  add1,
  useIndexCalls,
} from "../../plugins/ops";
import { renameIdents } from "../../plugins/idents";
import { evalStaticExpr } from "../../plugins/static";
import { flipBinaryOps } from "../../plugins/binaryOps";
import { golfLastPrint } from "../../plugins/print";
import { addImports } from "./plugins";
import { forArgvToForEach } from "../../plugins/loops";

const golfscriptLanguage: Language = {
  name: "Golfscript",
  extension: "gs",
  emitter: emitProgram,
  golfPlugins: [
    flipBinaryOps,
    evalStaticExpr,
    golfLastPrint(),
    equalityToInequality,
  ],
  emitPlugins: [useIndexCalls(), forArgvToForEach],
  finalEmitPlugins: [
    mapOps([
      ["argv", (_) => id("a", true)],
      ["true", (_) => id("1", true)],
      ["false", (_) => id("0", true)],
      ["println", (x) => functionCall(x, "puts")],
      ["print", (x) => functionCall(x, "print")],

      [
        "text_get_byte_slice",
        (x) => rangeIndexCall(x[0], x[1], add1(x[2]), id("1", true)),
      ],
    ]),
    mapPrecedenceOps([
      ["not", "!"],
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
      ["concat", "+"],
      ["lt", "<"],
      ["eq", "="],
      ["gt", ">"],
      ["and", "and"],
      ["or", "or"],
      ["text_get_byte", "="],
      ["text_byte_length", ","],
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

      ["neg", "-1*"],
      ["leq", ")<"],
      ["neq", "=!"],
      ["geq", "(>"],
      ["join", "''*"],
      ["text_byte_reversed", "-1%"],
      ["text_get_byte", "=[]+''+"],
      ["int_to_text_byte", "[]+''+"],
      ["max", "[]++$1="],
      ["min", "[]++$0="],
      ["bit_shift_left", "2\\?*"],
      ["bit_shift_right", "2\\?/"],

      ["argv_get", "a="],
    ]),
    addImports,
    renameIdents({
      // Custom Ident generator prevents `n` from being used as an ident, as it is predefined to newline and breaks printing if modified
      preferred(original: string) {
        if (/n/i.test(original[0])) return ["N", "m", "M"];
        const lower = original[0].toLowerCase();
        const upper = original[0].toUpperCase();
        return [original[0], original[0] === lower ? upper : lower];
      },
      short: "abcdefghijklmopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
      general: (i: number) => "v" + i.toString(),
    }),
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
