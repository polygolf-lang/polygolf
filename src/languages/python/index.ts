import {
  functionCall,
  id,
  indexCall,
  methodCall,
  rangeIndexCall,
  stringLiteral,
  int,
  polygolfOp,
  listType,
  textType,
  namedArg,
  add1,
} from "../../IR";
import { Language } from "../../common/Language";

import emitProgram, { emitPythonStringLiteral } from "./emit";
import {
  mapOps,
  mapToUnaryAndBinaryOps,
  useIndexCalls,
  addMutatingBinaryOp,
  removeImplicitConversions,
} from "../../plugins/ops";
import { aliasBuiltins, renameIdents } from "../../plugins/idents";
import { forArgvToForEach, forRangeToForEach } from "../../plugins/loops";
import { golfStringListLiteral } from "../../plugins/static";
import { golfLastPrint, implicitlyConvertPrintArg } from "../../plugins/print";
import {
  packSource2to1,
  packSource3to1,
  useDecimalConstantPackedPrinter,
  useLowDecimalListPackedPrinter,
} from "../../plugins/packing";
import {
  textGetToIntToTextGet,
  textToIntToTextGetToInt,
  useEquivalentTextOp,
} from "../../plugins/textOps";
import {
  addOneToManyAssignments,
  tempVarToMultipleAssignment,
} from "../../plugins/block";
import { addImports } from "../../plugins/imports";
import {
  applyDeMorgans,
  bitnotPlugins,
  equalityToInequality,
  useIntegerTruthiness,
} from "../../plugins/arithmetic";

const pythonLanguage: Language = {
  name: "Python",
  extension: "py",
  emitter: emitProgram,
  golfPlugins: [
    golfStringListLiteral(),
    tempVarToMultipleAssignment,
    forRangeToForEach("array_get", "list_get", "text_get_codepoint"),
    golfLastPrint(),
    equalityToInequality,
    useDecimalConstantPackedPrinter,
    useLowDecimalListPackedPrinter,
    textToIntToTextGetToInt,
    ...bitnotPlugins,
    applyDeMorgans,
    useIntegerTruthiness,
  ],
  emitPlugins: [
    forArgvToForEach,
    useEquivalentTextOp(false, true),
    mapOps([
      ["argv", (x) => id("sys.argv[1:]", true)],
      [
        "argv_get",
        (x) =>
          polygolfOp(
            "list_get",
            { ...id("sys.argv", true), type: listType(textType()) },
            add1(x[0])
          ),
      ],
    ]),
    useIndexCalls(),
  ],
  finalEmitPlugins: [
    textGetToIntToTextGet,
    implicitlyConvertPrintArg,
    mapOps([
      ["true", (_) => int(1)],
      ["false", (_) => int(0)],
      ["abs", (x) => functionCall("abs", x)],
      ["list_length", (x) => functionCall("len", x)],
      ["join_using", (x) => methodCall(x[1], "join", x[0])],
      ["join", (x) => methodCall(stringLiteral(""), "join", x[0])],
      ["sorted", (x) => functionCall("sorted", x[0])],
      [
        "text_codepoint_reversed",
        (x) => rangeIndexCall(x[0], id("", true), id("", true), int(-1)),
      ],
      ["codepoint_to_int", (x) => functionCall("ord", x)],
      ["text_get_codepoint", (x) => indexCall(x[0], x[1])],
      ["int_to_codepoint", (x) => functionCall("chr", x)],
      ["max", (x) => functionCall("max", x)],
      ["min", (x) => functionCall("min", x)],
      [
        "text_get_codepoint_slice",
        (x) => rangeIndexCall(x[0], x[1], add1(x[2]), int(1)),
      ],
      ["text_codepoint_length", (x) => functionCall("len", x)],
      ["int_to_text", (x) => functionCall("str", x)],
      ["text_split", (x) => methodCall(x[0], "split", x[1])],
      ["text_split_whitespace", (x) => methodCall(x[0], "split")],
      ["text_to_int", (x) => functionCall("int", x)],
      ["println", (x) => functionCall("print", x)],
      [
        "print",
        (x) => {
          return functionCall(
            "print",
            x[0].kind !== "ImplicitConversion"
              ? [namedArg("end", x[0])]
              : [x[0], namedArg("end", stringLiteral(""))]
          );
        },
      ],
    ]),
    addMutatingBinaryOp(
      ["add", "+"],
      ["concat", "+"],
      ["sub", "-"],
      ["mul", "*"],
      ["mul", "*"],
      ["repeat", "*"],
      ["div", "//"],
      ["mod", "%"],
      ["pow", "**"],
      ["bit_and", "&"],
      ["bit_xor", "^"],
      ["bit_or", "|"],
      ["bit_shift_left", "<<"],
      ["bit_shift_right", ">>"]
    ),
    mapToUnaryAndBinaryOps(
      ["pow", "**"],
      ["neg", "-"],
      ["bit_not", "~"],
      ["mul", "*"],
      ["repeat", "*"],
      ["div", "//"],
      ["mod", "%"],
      ["add", "+"],
      ["concat", "+"],
      ["sub", "-"],
      ["bit_shift_left", "<<"],
      ["bit_shift_right", ">>"],
      ["bit_and", "&"],
      ["bit_xor", "^"],
      ["bit_or", "|"],
      ["lt", "<"],
      ["leq", "<="],
      ["eq", "=="],
      ["neq", "!="],
      ["geq", ">="],
      ["gt", ">"],
      ["not", "not"],
      ["and", "and"],
      ["or", "or"]
    ),
    aliasBuiltins(),
    renameIdents(),
    addOneToManyAssignments(),
    addImports(
      [
        ["sys.argv[1:]", "sys"],
        ["sys.argv", "sys"],
      ],
      "import"
    ),
    removeImplicitConversions,
  ],
  packers: [
    (x) =>
      `exec(bytes(${emitPythonStringLiteral(packSource2to1(x))},'u16')[2:])`,
    (x) => {
      if ([...x].map((x) => x.charCodeAt(0)).some((x) => x < 32)) return null;
      return `exec(bytes(ord(c)%i+32for c in${emitPythonStringLiteral(
        packSource3to1(x)
      )}for i in b'abc'))`;
    },
  ],
};

export default pythonLanguage;
