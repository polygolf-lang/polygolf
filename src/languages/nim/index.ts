import {
  functionCall,
  id,
  indexCall,
  int,
  polygolfOp,
  rangeIndexCall,
} from "../../IR";
import { defaultDetokenizer, Language } from "../../common/Language";

import emitProgram from "./emit";
import { divToTruncdiv, modToRem } from "../../plugins/divisionOps";
import { mapOps, mapPrecedenceOps, useIndexCalls } from "../../plugins/ops";
import {
  addImports,
  addVarDeclarations,
  useUFCS,
  useUnsignedDivision,
} from "./plugins";
import { renameIdents } from "../../plugins/idents";
import { tempVarToMultipleAssignment } from "../../plugins/tempVariables";
import { useInclusiveForRange } from "../../plugins/loops";
import { evalStaticExpr, golfStringListLiteral } from "../../plugins/static";
import { addMutatingBinaryOp, flipBinaryOps } from "../../plugins/binaryOps";
import { golfLastPrint } from "../../plugins/print";
import { tableHashing } from "../../plugins/hashing";
import hash from "./hash";

const nimLanguage: Language = {
  name: "Nim",
  extension: "nim",
  emitter: emitProgram,
  golfPlugins: [
    flipBinaryOps,
    golfStringListLiteral,
    evalStaticExpr,
    golfLastPrint(),
    tempVarToMultipleAssignment,
    tableHashing(hash),
  ],
  emitPlugins: [modToRem, divToTruncdiv, useInclusiveForRange, useIndexCalls()],
  finalEmitPlugins: [
    mapOps([
      [
        "argv_get",
        (x) => functionCall([polygolfOp("add", x[0], int(1n))], "paramStr"),
      ],
    ]),
    mapOps([
      ["text_get_byte", (x) => functionCall([indexCall(x[0], x[1])], "ord")],
      ["text_get_byte_slice", (x) => rangeIndexCall(x[0], x[1], x[2], int(1n))],
      ["text_split", (x) => functionCall(x, "split")],
      ["text_split_whitespace", (x) => functionCall(x, "split")],
      ["text_byte_length", (x) => functionCall(x, "len")],
      ["repeat", (x) => functionCall(x, "repeat")],
      ["max", (x) => functionCall(x, "max")],
      ["min", (x) => functionCall(x, "min")],
      ["abs", (x) => functionCall(x, "abs")],
      ["text_to_int", (x) => functionCall(x, "parseInt")],
      ["print", (x) => functionCall([id("stdout", true), x[0]], "write")],
      ["println", (x) => functionCall(x, "echo")],
      ["min", (x) => functionCall(x, "min")],
      ["max", (x) => functionCall(x, "max")],
      ["abs", (x) => functionCall(x, "abs")],
      ["bool_to_int", (x) => functionCall(x, "int")],
      ["byte_to_text", (x) => functionCall(x, "chr")],
    ]),
    mapPrecedenceOps(
      [
        ["bit_not", "not"],
        ["not", "not"],
        ["neg", "-"],
        ["int_to_text", "$"],
      ],
      [["pow", "^"]],
      [
        ["mul", "*"],
        ["trunc_div", "div"],
        ["rem", "mod"],
      ],
      [
        ["add", "+"],
        ["sub", "-"],
      ],
      [["text_concat", "&", false]],
      [
        ["lt", "<"],
        ["leq", "<="],
        ["eq", "=="],
        ["neq", "!="],
        ["geq", ">="],
        ["gt", ">"],
      ],
      [
        ["and", "and"],
        ["bit_and", "and"],
      ],
      [
        ["or", "or"],
        ["bit_or", "or"],
        ["bit_xor", "xor"],
      ]
    ),
    addMutatingBinaryOp("+", "*", "-", "&"),
    useUFCS,
    useUnsignedDivision,
    addImports,
    renameIdents(),
    addVarDeclarations,
  ],
  detokenizer: defaultDetokenizer(
    (a, b) =>
      a !== "" &&
      b !== "" &&
      ((/[A-Za-z0-9_]/.test(a[a.length - 1]) && /[A-Za-z0-9_]/.test(b[0])) ||
        ("=+-*/<>@$~&%|!?^.:\\".includes(a[a.length - 1]) &&
          "=+-*/<>@$~&%|!?^.:\\".includes(b[0])) ||
        (/[A-Za-z]/.test(a[a.length - 1]) && b[0] === `"`))
  ),
};

export default nimLanguage;
