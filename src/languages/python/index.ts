import { assignment, functionCall, id, indexCall, methodCall } from "../../IR";
import { Language } from "../../common/Language";

import emitProgram, { emitPythonStringLiteral } from "./emit";
import { mapOps, mapPrecedenceOps, useIndexCalls } from "../../plugins/ops";
import { aliasBuiltins, renameIdents } from "../../plugins/idents";
import { tempVarToMultipleAssignment } from "../../plugins/tempVariables";
import { forRangeToForEach } from "../../plugins/loops";
import { evalStaticExpr, golfStringListLiteral } from "../../plugins/static";
import { golfLastPrint } from "../../plugins/print";
import {
  packSource2to1,
  packSource3to1,
  useDecimalConstantPackedPrinter,
  useLowDecimalListPackedPrinter,
} from "../../plugins/packing";

const pythonLanguage: Language = {
  name: "Python",
  extension: "py",
  emitter: emitProgram,
  golfPlugins: [
    golfStringListLiteral,
    evalStaticExpr,
    tempVarToMultipleAssignment,
    forRangeToForEach,
    golfLastPrint(),
    useDecimalConstantPackedPrinter,
    useLowDecimalListPackedPrinter,
  ],
  emitPlugins: [useIndexCalls()],
  finalEmitPlugins: [
    mapOps([
      ["text_get_byte", (x) => functionCall([indexCall(x[0], x[1])], "ord")],
      ["text_length", (x) => functionCall([x[0]], "len")],
      ["int_to_text", (x) => functionCall([x[0]], "str")],
      ["text_split", (x) => methodCall(x[0], [x[1]], "split")],
      ["text_split_whitespace", (x) => methodCall(x[0], [], "split")],
      ["text_to_int", (x) => functionCall([x[0]], "int")],
      ["println", (x) => functionCall([x[0]], "print")],
      [
        "print",
        (x) => functionCall([assignment(id("end", true), x[0])], "print"),
      ],
    ]),
    mapPrecedenceOps(
      [["pow", "**"]],
      [
        ["neg", "-"],
        ["bit_not", "~"],
      ],
      [
        ["mul", "*"],
        ["repeat", "*"],
        ["div", "//"],
        ["mod", "%"],
      ],
      [
        ["add", "+"],
        ["text_concat", "+"],
        ["sub", "-"],
      ],
      [["bit_and", "&"]],
      [["bit_xor", "^"]],
      [["bit_or", "|"]],
      [
        ["lt", "<"],
        ["leq", "<="],
        ["eq", "=="],
        ["neq", "!="],
        ["geq", ">="],
        ["gt", ">"],
      ],
      [["not", "not"]],
      [["and", "and"]],
      [["or", "or"]]
    ),
    aliasBuiltins(),
    renameIdents(),
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
