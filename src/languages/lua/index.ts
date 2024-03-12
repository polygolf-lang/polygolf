import {
  functionCall as func,
  implicitConversion,
  int,
  methodCall as method,
  op,
  text,
  succ,
  isText,
} from "../../IR";
import {
  type Language,
  required,
  search,
  simplegolf,
} from "../../common/Language";
import {
  forArgvToForRange,
  rangeExclusiveToInclusive,
  forRangeToForRangeOneStep,
  shiftRangeOneUp,
  forEachToForRange,
} from "../../plugins/loops";

import { LuaEmitter } from "./emit";
import {
  flipBinaryOps,
  removeImplicitConversions,
  printIntToPrint,
  mapOps,
  mapOpsTo,
  mapBackwardsIndexToForwards,
  mapMutationTo,
} from "../../plugins/ops";
import { alias, renameIdents } from "../../plugins/idents";
import {
  tempVarToMultipleAssignment,
  inlineVariables,
} from "../../plugins/block";
import {
  golfLastPrint,
  implicitlyConvertPrintArg,
  putcToPrintChar,
  mergePrint,
} from "../../plugins/print";
import {
  charToIntToDec,
  ordToDecToInt,
  startsWithEndsWithToSliceEquality,
  usePrimaryTextOps,
} from "../../plugins/textOps";
import { assertInt64 } from "../../plugins/types";
import {
  applyDeMorgans,
  bitnotPlugins,
  decomposeIntLiteral,
  divisionToComparisonAndBack,
  equalityToInequality,
  lowBitsPlugins,
  pickAnyInt,
  useIntegerTruthiness,
} from "../../plugins/arithmetic";
import { listOpsToTextOps } from "../../plugins/static";
import { base10DecompositionToFloatLiteralAsBuiltin } from "./plugins";
import { getType } from "../../common/getType";
import { conditionalOpToAndOr } from "../../plugins/conditions";

const luaLanguage: Language = {
  name: "Lua",
  extension: "lua",
  emitter: new LuaEmitter(),
  phases: [
    required(printIntToPrint, putcToPrintChar, usePrimaryTextOps("byte")),
    simplegolf(golfLastPrint(), charToIntToDec, ordToDecToInt),
    search(
      mergePrint,
      flipBinaryOps,
      listOpsToTextOps("find[byte]", "at[byte]"),
      tempVarToMultipleAssignment,
      equalityToInequality,
      ...bitnotPlugins,
      ...lowBitsPlugins,
      applyDeMorgans,
      useIntegerTruthiness,
      forRangeToForRangeOneStep,
      inlineVariables,
      forArgvToForRange(),
      implicitlyConvertPrintArg,
      mapOps({
        dec_to_int: (a) => op.add(int(0n), implicitConversion("dec_to_int", a)),
      }),
      decomposeIntLiteral(true, true, true),
      ...divisionToComparisonAndBack,
    ),
    required(
      pickAnyInt,
      forArgvToForRange(),
      forEachToForRange,
      rangeExclusiveToInclusive(),
      implicitlyConvertPrintArg,
      startsWithEndsWithToSliceEquality("byte"),
      mapOps({
        dec_to_int: (a) => op.mul(int(1n), implicitConversion("dec_to_int", a)),
        "at[argv]": (a) => op["at[List]"](op.argv, a),
        "ord_at[byte]": (a, b) => method(a, "byte", succ(b)),
        "ord[byte]": (a) => method(a, "byte", int(1)),
        "ord_at_back[byte]": (a, b) => method(a, "byte", b),
        "at[byte]": (a, b) => method(a, "sub", succ(b), succ(b)),
        "at_back[byte]": (a, b) => method(a, "sub", b, b),
        "slice[byte]": (a, b, c) => method(a, "sub", succ(b), op.add(b, c)),
      }),
      conditionalOpToAndOr(
        (n, s) => !["boolean", "void"].includes(getType(n, s).kind),
        "List",
      ),
      mapBackwardsIndexToForwards({
        "at_back[Ascii]": "size[Ascii]",
        "at_back[byte]": "size[byte]",
        "at_back[codepoint]": "size[codepoint]",
        "at_back[List]": "size[List]",
        "slice_back[Ascii]": "size[Ascii]",
        "slice_back[byte]": "size[byte]",
        "slice_back[codepoint]": "size[codepoint]",
        "slice_back[List]": "size[List]",
        "with_at_back[List]": "size[List]",
      }),
      mapMutationTo.index({
        "with_at[Array]": 1,
        "with_at[List]": 1,
        "with_at[Table]": 0,
      }),
      mapOpsTo.index({
        "at[Array]": 1,
        "at[List]": 1,
        "at[Table]": 0,
      }),
    ),
    search(inlineVariables, shiftRangeOneUp),
    required(
      mapOps({
        int_to_dec: (a) =>
          op["concat[Text]"](text(""), implicitConversion("int_to_dec", a)),
        join: (a, b) => func("table.concat", isText("")(b) ? [a] : [a, b]),
        "char[byte]": (x) => func("string.char", x),

        replace: (a, b, c) =>
          method(
            a,
            "gsub",
            isText()(b)
              ? text(
                  b.value.replace(
                    /(-|%|\^|\$|\(|\)|\.|\[|\]|\*|\+|\?)/g,
                    "%$1",
                  ),
                )
              : method(b, "gsub", text("(%W)"), text("%%%1")),
            isText()(c)
              ? text(c.value.replace("%", "%%"))
              : method(c, "gsub", text("%%"), text("%%%%")),
          ),
      }),
      mapOpsTo.method({
        "size[byte]": "len",
        repeat: "rep",
      }),
      mapOpsTo.builtin({
        argv: "arg",
        true: "true",
        false: "false",
      }),
      mapOpsTo.func({
        "read[line]": "io.read",
        "print[Text]": "io.write",
        "println[Text]": "print",
        "reversed[byte]": "string.reverse",
        min: "math.min",
        max: "math.max",
        abs: "math.abs",
      }),
    ),

    simplegolf(base10DecompositionToFloatLiteralAsBuiltin),
    required(
      mapOpsTo.infix({
        pow: "^",
        div: "//",
        mod: "%",
        add: "+",
        binarySub: "-",
        "concat[Text]": "..",
        bit_shift_left: "<<",
        bit_shift_right: ">>",
        bit_and: "&",
        bit_xor: "~",
        bit_or: "|",
        lt: "<",
        leq: "<=",
        "eq[Int]": "==",
        "eq[Text]": "==",
        "neq[Int]": "~=",
        "neq[Text]": "~=",
        geq: ">=",
        gt: ">",
        and: "and",
        or: "or",
      }),
      mapOpsTo.prefix({
        not: "not",
        neg: "-",
        "size[List]": "#",
        "size[Table]": "#",
        "size[byte]": "#",
        bit_not: "~",
      }),
      mapOpsTo.infix({ mul: "*" }),
    ),
    simplegolf(
      alias({
        Identifier: (n, s) =>
          n.builtin &&
          (s.parent?.node.kind !== "MethodCall" ||
            s.pathFragment?.prop !== "ident")
            ? n.name
            : undefined,
        Integer: (x) => x.value.toString(),
        Text: (x) => `"${x.value}"`,
      }),
    ),
    required(renameIdents(), assertInt64, removeImplicitConversions),
  ],
};

export default luaLanguage;
