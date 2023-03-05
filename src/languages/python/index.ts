import {
  assignment,
  functionCall,
  id,
  indexCall,
  methodCall,
  rangeIndexCall,
  stringLiteral,
  int,
  importStatement,
  block,
  polygolfOp,
  listType,
  textType,
} from "../../IR";
import { Language, Plugin } from "../../common/Language";

import emitProgram, { emitPythonStringLiteral } from "./emit";
import {
  equalityToInequality,
  mapOps,
  mapPrecedenceOps,
  useIndexCalls,
  add1,
} from "../../plugins/ops";
import { aliasBuiltins, renameIdents } from "../../plugins/idents";
import { tempVarToMultipleAssignment } from "../../plugins/tempVariables";
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
import { addMutatingBinaryOp } from "../../plugins/binaryOps";

// abstract out as a part of https://github.com/jared-hughes/polygolf/issues/89
const addImports: Plugin = {
  name: "addImports",
  visit(node, spine) {
    if (
      node.kind === "Program" &&
      spine.someNode(
        (x) => x.kind === "Identifier" && x.builtin && x.name.startsWith("sys.")
      )
    ) {
      return {
        ...node,
        body: block([
          importStatement("import", ["sys"]),
          ...(node.body.kind === "Block" ? node.body.children : [node.body]),
        ]),
      };
    }
  },
};

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
          const type = getType(x[0], spine.root.node);
          return functionCall(
            type.kind === "text"
              ? [assignment(id("end", true), x[0])]
              : [x[0], assignment(id("end", true), stringLiteral(""))],
            "print"
          );
        },
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
        ["concat", "+"],
        ["sub", "-"],
      ],
      [
        ["bit_shift_left", "<<"],
        ["bit_shift_right", ">>"],
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
    addMutatingBinaryOp(
      "+",
      "*",
      "-",
      "//",
      "%",
      "**",
      "&",
      "|",
      "^",
      ">>",
      "<<"
    ),
    aliasBuiltins(),
    renameIdents(),
    addImports,
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
