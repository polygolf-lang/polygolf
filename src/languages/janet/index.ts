import {
  type Language,
  required,
  simplegolf,
  search,
} from "../../common/Language";
import { JanetEmitter } from "./emit";
import {
  arraysToLists,
  flipBinaryOps,
  flipped,
  mapBackwardsIndexToForwards,
  mapMutationTo,
  mapOps,
  mapOpsTo,
  removeImplicitConversions,
} from "../../plugins/ops";
import { addVarDeclarations } from "../../plugins/block";
import {
  succ,
  builtin,
  conditional,
  functionCall as func,
  int,
  list,
  op,
  rangeIndexCall,
  text,
  intToDecOpOrText,
  isForEachChar,
  cast,
} from "../../IR";
import { golfLastPrint, golfLastPrintInt } from "../../plugins/print";
import {
  charToIntToDec,
  decToIntToOrd,
  usePrimaryTextOps,
} from "../../plugins/textOps";
import { golfStringListLiteral, listOpsToTextOps } from "../../plugins/static";
import {
  applyDeMorgans,
  bitnotPlugins,
  comparisonToDivision,
  equalityToInequality,
  lowBitsPlugins,
  pickAnyInt,
  truncatingOpsPlugins,
} from "../../plugins/arithmetic";
import { forArgvToForEach, forEachToForRange } from "../../plugins/loops";
import { alias, clone, renameIdents } from "../../plugins/idents";
import { assertInt64 } from "../../plugins/types";
import { implicitlyConvertConcatArg } from "./plugins";
import { applyIf } from "../../plugins/helpers";

const janetLanguage: Language = {
  name: "Janet",
  extension: "janet",
  emitter: new JanetEmitter(),
  phases: [
    required(arraysToLists, usePrimaryTextOps("byte")),
    simplegolf(golfLastPrint(false), golfLastPrintInt(true)),
    search(
      flipBinaryOps,
      golfStringListLiteral(false),
      listOpsToTextOps(),
      equalityToInequality,
      ...bitnotPlugins,
      ...lowBitsPlugins,
      applyDeMorgans,
      decToIntToOrd,
    ),

    required(
      pickAnyInt,
      forArgvToForEach,
      applyIf(forEachToForRange, isForEachChar),
      mapOps({
        right_align: (a, b) =>
          func(
            "string/format",
            op["concat[Text]"](text("%"), intToDecOpOrText(b), text("s")),
            a,
          ),
        int_to_hex_aligned: (a, b) =>
          func(
            "string/format",
            op["concat[Text]"](text("%0"), intToDecOpOrText(b), text("x")),
            a,
          ),
        int_to_Hex_aligned: (a, b) =>
          func(
            "string/format",
            op["concat[Text]"](text("%0"), intToDecOpOrText(b), text("X")),
            a,
          ),
      }),
    ),
    simplegolf(
      implicitlyConvertConcatArg,
      charToIntToDec,
      comparisonToDivision,
    ),
    required(
      mapOps({
        argv: () => func("slice", func("dyn", builtin(":args")), int(1n)),

        append: (a, b) => op["concat[List]"](a, list([b])),

        "at[argv]": (a) =>
          op["at[List]"](func("dyn", builtin(":args")), succ(a)),
        "contains[Text]": (a, b) => func("int?", op["find[byte]"](a, b)),
        "contains[Table]": (a, b) =>
          op.not(func("nil?", op["at[Table]"](a, b))),
      }),
      mapOpsTo.func({
        "last[List]": "last",
      }),
      mapBackwardsIndexToForwards({
        "at_back[Ascii]": "size[Ascii]",
        "at_back[byte]": "size[byte]",
        "at_back[codepoint]": "size[codepoint]",
        "at_back[List]": "size[List]",
        "with_at_back[List]": "size[List]",
      }),
      mapOpsTo.func({
        "ord_at[byte]": "",
      }),
      mapOps({
        "at[byte]": (a, b) => op["slice[byte]"](a, b, int(1n)),
        "ord[byte]": (a) => func("", a, int(0)),
      }),
      mapOpsTo.func({
        "at[List]": "",
        "at[Table]": "",
      }),
      mapOps({
        bool_to_int: (a) => conditional(a, int(1n), int(0n)),
        int_to_bool: (a) => op["neq[Int]"](a, int(0n)),
        int_to_hex: (a) => func("string/format", text("%x"), a),
        int_to_Hex: (a) => func("string/format", text("%X"), a),
        "char[byte]": (a) => func("string/format", text("%c"), a),
        "concat[List]": (...x) => func("array/concat", list([]), ...x),
        "slice[byte]": (a, b, c) => rangeIndexCall(a, b, op.add(b, c), int(1n)),
        "slice[List]": (a, b, c) => rangeIndexCall(a, b, op.add(b, c), int(1n)),
      }),
      mapOpsTo.builtin({ true: "true", false: "false" }),
      mapOpsTo.func({
        is_even: "even?",
        is_odd: "odd?",
      }),
      ...truncatingOpsPlugins,
      mapMutationTo.func({
        succ: "++",
        pred: "--",
        add: "+=",
        sub: "-=",
        mul: "*=",
        rem: "%=",
        "with_at[List]": "put",
        "with_at[Table]": "put",
        append: "array/push",
      }),
      mapOpsTo.func({ gcd: "math/gcd" }, "leftChain"),
      mapOpsTo.func({
        split: flipped`string/split`,
        "find[byte]": flipped`string/find`,
        replace: "peg/replace-all",
        "concat[Text]": "string",
        abs: "math/abs",
        add: "+",
        and: "and",
        bit_and: "band",
        bit_not: "bnot",
        bit_or: "bor",
        bit_shift_left: "blshift",
        bit_shift_right: "brshift",
        bit_xor: "bxor",
        dec_to_int: "eval-string",
        geq: ">=",
        gt: ">",
        int_to_dec: "string",
        join: "string/join",
        leq: "<=",
        lt: "<",
        max: "max",
        min: "min",
        mul: "*",
        neg: "-",
        not: "not",
        or: "or",
        pow: "math/pow",
        rem: "%",
        repeat: "string/repeat",
        sub: "-",
        trunc_div: "div",

        "eq[Int]": "=",
        "eq[Text]": "=",
        "size[byte]": "length",
        "size[List]": "length",
        "size[Table]": "length",
        "neq[Int]": "not=",
        "neq[Text]": "not=",
        "println[Int]": "pp",
        "println[Text]": "print",
        "print[Int]": "prin",
        "print[Text]": "prin",
        "reversed[byte]": "reverse",
        "reversed[List]": "reverse",
        "sorted[Ascii]": "sorted",
        "sorted[Int]": "sorted",
      }),
      clone((node, type) => {
        if (["boolean", "integer", "text"].includes(type.kind)) {
          return node;
        }
        if (
          type.kind === "List" &&
          ["boolean", "integer", "text"].includes(type.member.kind)
        ) {
          return cast(node, "array");
        }
        return func("thaw", node);
      }),
    ),
    simplegolf(
      alias(
        {
          Identifier: (n, s) =>
            n.builtin && s.pathFragment?.prop !== "ident" ? n.name : undefined,
          Integer: (x) => x.value.toString(),
          Text: (x) => `"${x.value}"`,
        },
        [1, 7],
      ),
    ),
    required(
      renameIdents(),
      addVarDeclarations,
      removeImplicitConversions,
      assertInt64,
    ),
  ],
};

export default janetLanguage;
