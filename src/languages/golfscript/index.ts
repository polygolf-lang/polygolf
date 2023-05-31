import {
  assignment,
  functionCall,
  integerType,
  isSubtype,
  rangeIndexCall,
  add1,
  builtin,
} from "../../IR";
import { defaultDetokenizer, Language } from "../../common/Language";

import emitProgram from "./emit";
import {
  mapOps,
  mapToUnaryAndBinaryOps,
  useIndexCalls,
  flipBinaryOps,
  removeImplicitConversions,
} from "../../plugins/ops";
import { alias, renameIdents } from "../../plugins/idents";
import { golfLastPrint, implicitlyConvertPrintArg } from "../../plugins/print";
import {
  forArgvToForEach,
  forRangeToForDifferenceRange,
  forRangeToForRangeOneStep,
} from "../../plugins/loops";
import { addImports } from "../../plugins/imports";
import { getType } from "../../common/getType";
import {
  bitnotPlugins,
  applyDeMorgans,
  equalityToInequality,
} from "../../plugins/arithmetic";

const golfscriptLanguage: Language = {
  name: "Golfscript",
  extension: "gs",
  emitter: emitProgram,
  golfPlugins: [
    flipBinaryOps,
    golfLastPrint(),
    equalityToInequality,
    ...bitnotPlugins,
    applyDeMorgans,
    forRangeToForRangeOneStep,
  ],
  emitPlugins: [useIndexCalls(), forArgvToForEach],
  finalEmitPlugins: [
    forRangeToForDifferenceRange(
      (node, spine) =>
        !isSubtype(getType(node.start, spine.root.node), integerType(0))
    ),
    implicitlyConvertPrintArg,
    alias((expr) => {
      switch (expr.kind) {
        case "IntegerLiteral":
          return expr.value.toString();
        case "TextLiteral":
          return `"${expr.value}"`;
      }
    }),
    mapOps(
      ["argv", builtin("a")],
      ["true", builtin("1")],
      ["false", builtin("0")],
      ["println", (x) => functionCall("n", x)],
      ["print", (x) => functionCall("", x)],

      [
        "text_get_byte_slice",
        (x) => rangeIndexCall(x[0], x[1], add1(x[2]), builtin("1")),
      ]
    ),
    mapToUnaryAndBinaryOps(
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
      ["text_get_byte_to_int", "="],
      ["text_byte_length", ","],
      ["int_to_text", "`"],
      ["text_split", "/"],
      ["repeat", "*"],
      ["pow", "?"],
      ["text_to_int", "~"],
      ["abs", "abs"],
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

      ["argv_get", "a="]
    ),
    addImports(
      [
        ["a=", "a"],
        ["a", "a"],
      ],
      (x) => (x.length > 0 ? assignment(x[0], builtin("")) : undefined)
    ),
    renameIdents({
      // Custom Ident generator prevents `n` from being used as an ident, as it is predefined to newline and breaks printing if modified
      preferred(original: string) {
        const firstLetter = [...original].find((x) => /[A-Za-z]/.test(x));
        if (firstLetter === undefined) return [];
        if (/n/i.test(firstLetter)) return ["N", "m", "M"];
        const lower = firstLetter.toLowerCase();
        const upper = firstLetter.toUpperCase();
        return [firstLetter, firstLetter === lower ? upper : lower];
      },
      short: "abcdefghijklmopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
      general: (i: number) => "v" + i.toString(),
    }),
    removeImplicitConversions,
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
