import {
  functionCall,
  id,
  indexCall,
  int,
  rangeIndexCall,
  add1,
} from "../../IR";
import { defaultDetokenizer, Language } from "../../common/Language";

import emitProgram from "./emit";
import {
  mapOps,
  mapToUnaryAndBinaryOps,
  useIndexCalls,
  addMutatingBinaryOp,
  flipBinaryOps,
  removeImplicitConversions,
} from "../../plugins/ops";
import { addNimImports, useUFCS, useUnsignedDivision } from "./plugins";
import { renameIdents } from "../../plugins/idents";
import {
  forArgvToForEach,
  forArgvToForRange,
  forRangeToForRangeInclusive,
  shiftRangeOneUp,
} from "../../plugins/loops";
import { golfStringListLiteral } from "../../plugins/static";
import { golfLastPrint } from "../../plugins/print";
import {
  useDecimalConstantPackedPrinter,
  useLowDecimalListPackedPrinter,
} from "../../plugins/packing";
import { tableHashing } from "../../plugins/hashing";
import hash from "./hash";
import { useEquivalentTextOp } from "../../plugins/textOps";
import { assertInt64 } from "../../plugins/types";
import {
  addManyToManyAssignments,
  addVarDeclarationManyToManyAssignments,
  addVarDeclarationOneToManyAssignments,
  addVarDeclarations,
  groupVarDeclarations,
  noStandaloneVarDeclarations,
  tempVarToMultipleAssignment,
} from "../../plugins/block";
import {
  equalityToInequality,
  truncatingOpsPlugins,
} from "../../plugins/arithmetic";

const nimLanguage: Language = {
  name: "Nim",
  extension: "nim",
  emitter: emitProgram,
  golfPlugins: [
    flipBinaryOps,
    golfStringListLiteral(),
    golfLastPrint(),
    tempVarToMultipleAssignment,
    useDecimalConstantPackedPrinter,
    useLowDecimalListPackedPrinter,
    tableHashing(hash),
    equalityToInequality,
    useEquivalentTextOp,
    shiftRangeOneUp,
    forRangeToForRangeInclusive,
  ],
  emitPlugins: [
    forArgvToForEach,
    forArgvToForRange(),
    ...truncatingOpsPlugins,
    useIndexCalls(),
    mapOps([
      ["argv", (x) => functionCall([], "commandLineParams")],
      ["argv_get", (x) => functionCall([add1(x[0])], "paramStr")],
    ]),
  ],
  finalEmitPlugins: [
    mapOps([
      ["true", (_) => id("true", true)],
      ["false", (_) => id("true", true)],
      ["text_byte_ord", (x) => functionCall([indexCall(x[0], x[1])], "ord")],
      ["text_get_byte", (x) => indexCall(x[0], x[1])],
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
    addMutatingBinaryOp(
      ["add", "+"],
      ["mul", "*"],
      ["sub", "-"],
      ["concat", "&"]
    ),
    mapToUnaryAndBinaryOps(
      ["bit_not", "not"],
      ["not", "not"],
      ["neg", "-"],
      ["int_to_text", "$"],
      ["pow", "^"],
      ["mul", "*"],
      ["trunc_div", "div"],
      ["rem", "mod"],
      ["bit_shift_left", "shl"],
      ["bit_shift_right", "shr"],
      ["add", "+"],
      ["sub", "-"],
      ["concat", "&"],
      ["lt", "<"],
      ["leq", "<="],
      ["eq", "=="],
      ["neq", "!="],
      ["geq", ">="],
      ["gt", ">"],
      ["and", "and"],
      ["bit_and", "and"],
      ["or", "or"],
      ["bit_or", "or"],
      ["bit_xor", "xor"]
    ),
    useUnsignedDivision,
    addNimImports,
    renameIdents(),
    addVarDeclarations,
    addVarDeclarationOneToManyAssignments(),
    addVarDeclarationManyToManyAssignments((_, spine) => spine.depth > 2),
    addManyToManyAssignments((_, spine) => spine.depth > 2),
    groupVarDeclarations((_, spine) => spine.depth <= 2),
    noStandaloneVarDeclarations,
    assertInt64,
    removeImplicitConversions,
    useUFCS,
  ],
  detokenizer: defaultDetokenizer((a, b) => {
    const left = a[a.length - 1];
    const right = b[0];

    if (/[A-Za-z0-9_]/.test(left) && /[A-Za-z0-9_]/.test(right)) return true; // alphanums meeting

    const symbols = "=+-*/<>@$~&%|!?^.:\\";
    if (symbols.includes(left) && symbols.includes(right)) return true; // symbols meeting

    if (
      /[A-Za-z]/.test(left) &&
      !["var", "in", "else", "if", "while", "for"].includes(a) &&
      (symbols + `"(`).includes(right) &&
      !["=", ":", ".", "::"].includes(b)
    )
      return true; // identifier meeting an operator or string literal or opening paren

    return false;
  }),
};

export default nimLanguage;
