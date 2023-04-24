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
} from "../../plugins/ops";
import { aliasBuiltins, renameIdents } from "../../plugins/idents";
import { forArgvToForEach, forRangeToForEach } from "../../plugins/loops";
import { evalStaticExpr, golfStringListLiteral } from "../../plugins/static";
import { golfLastPrint } from "../../plugins/print";
import { getType } from "../../common/getType";
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
import { equalityToInequality } from "../../plugins/arithmetic";

const pythonLanguage: Language = {
  name: "Python",
  extension: "py",
  emitter: emitProgram,
  golfPlugins: [
    golfStringListLiteral(),
    evalStaticExpr,
    tempVarToMultipleAssignment,
    forRangeToForEach("array_get", "list_get", "text_get_codepoint"),
    golfLastPrint(),
    equalityToInequality,
    useDecimalConstantPackedPrinter,
    useLowDecimalListPackedPrinter,
    textToIntToTextGetToInt,
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
    mapOps([
      ["true", (_) => int(1)],
      ["false", (_) => int(0)],
      ["abs", (x) => functionCall([x[0]], "abs")],
      ["list_length", (x) => functionCall([x[0]], "len")],
      ["join_using", (x) => methodCall(x[1], [x[0]], "join")],
      ["join", (x) => methodCall(stringLiteral(""), [x[0]], "join")],
      ["sorted", (x) => functionCall([x[0]], "sorted")],
      [
        "text_codepoint_reversed",
        (x) => rangeIndexCall(x[0], id("", true), id("", true), int(-1)),
      ],
      ["codepoint_to_int", (x) => functionCall(x, "ord")],
      ["text_get_codepoint", (x) => indexCall(x[0], x[1])],
      ["int_to_codepoint", (x) => functionCall([x[0]], "chr")],
      ["max", (x) => functionCall([x[0], x[1]], "max")],
      ["min", (x) => functionCall([x[0], x[1]], "min")],
      [
        "text_get_codepoint_slice",
        (x) => rangeIndexCall(x[0], x[1], add1(x[2]), int(1)),
      ],
      ["text_codepoint_length", (x) => functionCall([x[0]], "len")],
      ["int_to_text", (x) => functionCall([x[0]], "str")],
      ["text_split", (x) => methodCall(x[0], [x[1]], "split")],
      ["text_split_whitespace", (x) => methodCall(x[0], [], "split")],
      ["text_to_int", (x) => functionCall([x[0]], "int")],
      ["println", (x) => functionCall([x[0]], "print")],
      [
        "print",
        (x, spine) => {
          const type = getType(x[0], spine);
          return functionCall(
            type.kind === "text"
              ? [namedArg("end", x[0])]
              : [x[0], namedArg("end", stringLiteral(""))],
            "print"
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
