import {
  functionCall,
  indexCall,
  int,
  rangeIndexCall,
  add1,
  arrayConstructor,
  builtin,
  polygolfOp,
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
import { alias, renameIdents } from "../../plugins/idents";
import {
  forArgvToForEach,
  forArgvToForRange,
  forRangeToForEach,
  forRangeToForRangeInclusive,
  forRangeToForRangeOneStep,
  shiftRangeOneUp,
} from "../../plugins/loops";
import { golfStringListLiteral } from "../../plugins/static";
import { golfLastPrint, implicitlyConvertPrintArg } from "../../plugins/print";
import {
  useDecimalConstantPackedPrinter,
  useLowDecimalListPackedPrinter,
} from "../../plugins/packing";
import { tableHashing } from "../../plugins/hashing";
import hash from "./hash";
import {
  textToIntToTextGetToInt,
  useEquivalentTextOp,
  useMultireplace,
} from "../../plugins/textOps";
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
  applyDeMorgans,
  equalityToInequality,
  truncatingOpsPlugins,
  bitnotPlugins,
} from "../../plugins/arithmetic";

const nimLanguage: Language = {
  name: "Nim",
  extension: "nim",
  emitter: emitProgram,
  golfPlugins: [
    flipBinaryOps,
    golfStringListLiteral(),
    golfLastPrint(),
    forRangeToForEach("array_get", "list_get", "text_get_byte"),
    tempVarToMultipleAssignment,
    useDecimalConstantPackedPrinter,
    useLowDecimalListPackedPrinter,
    tableHashing(hash),
    equalityToInequality,
    shiftRangeOneUp,
    forRangeToForRangeInclusive(),
    ...bitnotPlugins,
    applyDeMorgans,
    textToIntToTextGetToInt,
    forRangeToForRangeOneStep,
    useMultireplace(),
  ],
  emitPlugins: [
    forArgvToForEach,
    forArgvToForRange(),
    ...truncatingOpsPlugins,
    useIndexCalls(),
    useEquivalentTextOp(true, false),
    mapOps(
      ["argv", functionCall("commandLineParams")],
      ["argv_get", (x) => functionCall("paramStr", add1(x[0]))]
    ),
  ],
  finalEmitPlugins: [
    forRangeToForRangeInclusive(true),
    implicitlyConvertPrintArg,
    mapOps([
      "text_byte_to_int",
      (x) => polygolfOp("text_get_byte_to_int", x[0], int(0n)),
    ]),
    mapOps([
      "text_get_byte_to_int",
      (x) => functionCall("ord", polygolfOp("text_get_byte", ...x)),
    ]),
    mapOps(
      ["true", builtin("true")],
      ["false", builtin("false")],
      ["text_get_byte", (x) => indexCall(x[0], x[1])],
      ["text_get_byte_slice", (x) => rangeIndexCall(x[0], x[1], x[2], int(1n))],
      ["text_split", (x) => functionCall("split", x)],
      ["text_split_whitespace", (x) => functionCall("split", x)],
      ["text_byte_length", (x) => functionCall("len", x)],
      ["repeat", (x) => functionCall("repeat", x)],
      ["max", (x) => functionCall("max", x)],
      ["min", (x) => functionCall("min", x)],
      ["abs", (x) => functionCall("abs", x)],
      ["text_to_int", (x) => functionCall("parseInt", x)],
      ["print", (x) => functionCall("write", builtin("stdout"), x)],
      ["println", (x) => functionCall("echo", x)],
      ["min", (x) => functionCall("min", x)],
      ["max", (x) => functionCall("max", x)],
      ["abs", (x) => functionCall("abs", x)],
      ["bool_to_int", (x) => functionCall("int", x)],
      ["int_to_text_byte", (x) => functionCall("chr", x)],
      [
        "text_replace",
        (x) =>
          functionCall(
            "replace",
            x[2].kind === "TextLiteral" && x[2].value === "" ? [x[0], x[1]] : x
          ),
      ],
      [
        "text_multireplace",
        (x) =>
          functionCall(
            "multireplace",
            x[0],
            arrayConstructor(
              x.flatMap((_, i) =>
                i % 2 > 0 ? [arrayConstructor(x.slice(i, i + 2))] : []
              ) // Polygolf doesn't have array of tuples, so we use array of arrays instead
            )
          ),
      ]
    ),
    useUnsignedDivision,
    addMutatingBinaryOp(
      ["add", "+"],
      ["mul", "*"],
      ["unsigned_rem", "%%"],
      ["unsigned_trunc_div", "/%"],
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
      ["unsigned_rem", "%%"],
      ["unsigned_trunc_div", "/%"],
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
    alias(
      (expr) => {
        switch (expr.kind) {
          case "IntegerLiteral":
            return expr.value.toString();
          case "TextLiteral":
            return `"${expr.value}"`;
        }
      },
      [1, 7]
    ),
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
      (symbols + `"({`).includes(right) &&
      !["=", ":", ".", "::"].includes(b)
    )
      return true; // identifier meeting an operator or string literal or opening paren

    return false;
  }),
};

export default nimLanguage;
