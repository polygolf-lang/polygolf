import {
  functionCall,
  indexCall,
  methodCall,
  rangeIndexCall,
  text,
  int,
  polygolfOp,
  listType,
  textType,
  namedArg,
  add1,
  tableConstructor,
  keyValue,
  TextLiteral,
  builtin,
  isTextLiteral,
} from "../../IR";
import { Language, required, search, simplegolf } from "../../common/Language";

import emitProgram, { emitPythonTextLiteral } from "./emit";
import {
  mapOps,
  mapToUnaryAndBinaryOps,
  useIndexCalls,
  addMutatingBinaryOp,
  removeImplicitConversions,
  methodsAsFunctions,
  printIntToPrint,
} from "../../plugins/ops";
import { alias, renameIdents } from "../../plugins/idents";
import {
  forArgvToForEach,
  forRangeToForEach,
  forRangeToForRangeOneStep,
  removeUnusedForVar,
} from "../../plugins/loops";
import { golfStringListLiteral, listOpsToTextOps } from "../../plugins/static";
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
  useMultireplace,
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
  lowBitsPlugins,
  useIntegerTruthiness,
} from "../../plugins/arithmetic";
import { tableToListLookup } from "../../plugins/tables";
import { charLength } from "../../common/objective";

const pythonLanguage: Language = {
  name: "Python",
  extension: "py",
  emitter: emitProgram,
  phases: [
    required(printIntToPrint),
    search(
      golfStringListLiteral(),
      listOpsToTextOps("text_codepoint_find", "text_get_codepoint"),
      tempVarToMultipleAssignment,
      forRangeToForEach("array_get", "list_get", "text_get_codepoint"),
      golfLastPrint(),
      equalityToInequality,
      useDecimalConstantPackedPrinter,
      useLowDecimalListPackedPrinter,
      textToIntToTextGetToInt,
      ...bitnotPlugins,
      ...lowBitsPlugins,
      applyDeMorgans,
      useIntegerTruthiness,
      forRangeToForRangeOneStep,
      tableToListLookup,
      useMultireplace(true),
      forArgvToForEach,
      useEquivalentTextOp(false, true),
      useIndexCalls()
    ),
    required(
      forArgvToForEach,
      removeUnusedForVar,
      useEquivalentTextOp(false, true),
      mapOps(
        ["argv", (x) => builtin("sys.argv[1:]")],
        [
          "argv_get",
          (x) =>
            polygolfOp(
              "list_get",
              { ...builtin("sys.argv"), type: listType(textType()) },
              add1(x[0])
            ),
        ]
      ),
      useIndexCalls(),

      textGetToIntToTextGet,
      implicitlyConvertPrintArg,
      mapOps(
        ["true", int(1)],
        ["false", int(0)],
        ["abs", (x) => functionCall("abs", x)],
        ["list_length", (x) => functionCall("len", x)],
        ["list_find", (x) => methodCall(x[0], "index", x[1])],
        ["join", (x) => methodCall(x[1], "join", x[0])],
        ["join", (x) => methodCall(text(""), "join", x[0])],
        ["sorted", (x) => functionCall("sorted", x[0])],
        [
          "text_codepoint_reversed",
          (x) => rangeIndexCall(x[0], builtin(""), builtin(""), int(-1)),
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
                : [x[0], namedArg("end", text(""))]
            );
          },
        ],
        ["text_replace", (x) => methodCall(x[0], "replace", x[1], x[2])],
        [
          "text_multireplace",
          (x) =>
            methodCall(
              x[0],
              "translate",
              tableConstructor(
                (x as TextLiteral[]).flatMap((_, i, x) =>
                  i % 2 > 0
                    ? [
                        keyValue(
                          int(x[i].value.codePointAt(0)!),
                          charLength(x[i + 1].value) === 1 &&
                            x[i + 1].value.codePointAt(0)! < 100
                            ? int(x[i + 1].value.codePointAt(0)!)
                            : x[i + 1]
                        ),
                      ]
                    : []
                )
              )
            ),
        ]
      ),
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
      methodsAsFunctions,
      addOneToManyAssignments()
    ),
    simplegolf(
      alias((expr, spine) => {
        switch (expr.kind) {
          case "Identifier":
            return expr.builtin &&
              (spine.parent?.node.kind !== "PropertyCall" ||
                spine.pathFragment !== "ident")
              ? expr.name
              : undefined;
          case "PropertyCall": // TODO: handle more general cases
            return isTextLiteral(expr.object) && expr.ident.builtin
              ? `"${expr.object.value}".${expr.ident.name}`
              : undefined;
          case "IntegerLiteral":
            return expr.value.toString();
          case "TextLiteral":
            return `"${expr.value}"`;
        }
      })
    ),
    required(
      renameIdents(),
      addImports(
        [
          ["sys.argv[1:]", "sys"],
          ["sys.argv", "sys"],
        ],
        "import"
      ),
      removeImplicitConversions
    ),
  ],
  packers: [
    (x) => `exec(bytes(${emitPythonTextLiteral(packSource2to1(x))},'u16')[2:])`,
    (x) => {
      if ([...x].map((x) => x.charCodeAt(0)).some((x) => x < 32)) return null;
      return `exec(bytes(ord(c)%i+32for c in${emitPythonTextLiteral(
        packSource3to1(x)
      )}for i in b'abc'))`;
    },
  ],
};

export default pythonLanguage;
