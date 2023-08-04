import {
  assignment,
  integerType,
  isSubtype,
  rangeIndexCall,
  add1,
  sub1,
  builtin,
  polygolfOp,
  int,
  text,
  binaryOp,
  listConstructor,
  unaryOp,
} from "../../IR";
import { defaultDetokenizer, Language, Language2 } from "../../common/Language";
import emitProgram from "./emit";
import {
  mapOps,
  mapToUnaryAndBinaryOps,
  flipBinaryOps,
  removeImplicitConversions,
  printIntToPrint,
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
  bitShiftToMulOrDiv,
  powPlugins,
} from "../../plugins/arithmetic";
import {
  useEquivalentTextOp,
  textGetToTextGetToIntToText,
} from "../../plugins/textOps";

const golfscriptLanguage: Language2 = {
  name: "Golfscript",
  extension: "gs",
  emitter: emitProgram,
  phases: [
    {
      mode: "required",
      plugins: [printIntToPrint],
    },
    {
      mode: "search",
      plugins: [
        flipBinaryOps,
        golfLastPrint(),
        equalityToInequality,
        ...bitnotPlugins,
        ...powPlugins,
        applyDeMorgans,
        forRangeToForRangeOneStep,
        forArgvToForEach,
        bitShiftToMulOrDiv(false, true, true),
      ],
    },
    {
      mode: "required",
      plugins: [
        forArgvToForEach,
        bitShiftToMulOrDiv(false, true, true),
        useEquivalentTextOp(true, false),
        textGetToTextGetToIntToText,
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
        mapOps([
          "argv_get",
          (x) => polygolfOp("list_get", polygolfOp("argv"), x[0]),
        ]),
        mapOps(
          ["argv", builtin("a")],
          ["true", int(1)],
          ["false", int(0)],
          ["print", (x) => x[0]],
          [
            "text_get_byte_slice",
            (x) => rangeIndexCall(x[0], x[1], add1(x[2]), int(1)),
          ],
          ["join", (x) => polygolfOp("join_using", x[0], text(""))],
          ["neg", (x) => polygolfOp("mul", x[0], int(-1))],
          [
            "max",
            (x) =>
              polygolfOp(
                "list_get",
                polygolfOp("sorted", listConstructor(x)),
                int(1)
              ),
          ],
          [
            "min",
            (x) =>
              polygolfOp(
                "list_get",
                polygolfOp("sorted", listConstructor(x)),
                int(0)
              ),
          ],
          [
            "leq",
            (x) =>
              polygolfOp(
                "lt",
                ...(x[0].kind === "IntegerLiteral"
                  ? [sub1(x[0]), x[1]]
                  : [x[0], add1(x[1])])
              ),
          ],
          [
            "geq",
            (x) =>
              polygolfOp(
                "gt",
                ...(x[0].kind === "IntegerLiteral"
                  ? [add1(x[0]), x[1]]
                  : [x[0], sub1(x[1])])
              ),
          ]
        ),
        mapToUnaryAndBinaryOps(
          ["println", "n"],
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
          ["text_byte_to_int", ")"],
          ["int_to_text", "`"],
          ["text_split", "/"],
          ["repeat", "*"],
          ["pow", "?"],
          ["text_to_int", "~"],
          ["abs", "abs"],
          ["list_push", "+"],
          ["list_get", "="],
          ["list_length", ","],
          ["join_using", "*"],
          ["sorted", "$"]
        ),
        mapOps(
          ["neq", (x) => unaryOp("!", binaryOp("=", x[0], x[1]))],
          ["text_byte_reversed", (x) => binaryOp("%", x[0], int(-1))],
          [
            "int_to_text_byte",
            (x) => binaryOp("+", listConstructor(x), text("")),
          ]
        ),
        addImports([["a", "a"]], (x) =>
          x.length > 0 ? assignment(x[0], builtin("")) : undefined
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
          short: "abcdefghijklmopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split(
            ""
          ),
          general: (i: number) => "v" + i.toString(),
        }),
        removeImplicitConversions,
      ],
    },
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
