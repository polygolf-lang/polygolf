import {
  type Language,
  required,
  simplegolf,
  search,
} from "../../common/Language";
import { ClojureEmitter } from "./emit";
import {
  arraysToLists,
  flipBinaryOps,
  flipped,
  mapBackwardsIndexToForwards,
  mapOps,
  mapOpsTo,
  removeImplicitConversions,
} from "../../plugins/ops";
import {
  builtin,
  conditional,
  functionCall as func,
  int,
  op,
  text,
  intToDecOpOrText,
} from "../../IR";
import { golfLastPrint, golfLastPrintInt } from "../../plugins/print";
import { usePrimaryTextOps } from "../../plugins/textOps";
import { golfStringListLiteral, listOpsToTextOps } from "../../plugins/static";
import {
  applyDeMorgans,
  bitnotPlugins,
  divToTruncdiv,
  equalityToInequality,
  lowBitsPlugins,
  pickAnyInt,
} from "../../plugins/arithmetic";
import { forArgvToForEach } from "../../plugins/loops";
import { alias, clone, renameIdents } from "../../plugins/idents";
import { assertInt64 } from "../../plugins/types";
import { implicitlyConvertConcatArg } from "./plugins";

const clojureLanguage: Language = {
  name: "Clojure",
  extension: "clj",
  emitter: new ClojureEmitter(),
  phases: [
    required(arraysToLists, usePrimaryTextOps("codepoint")),
    simplegolf(golfLastPrint(false), golfLastPrintInt(false)),
    search(
      flipBinaryOps,
      golfStringListLiteral(false),
      listOpsToTextOps(),
      equalityToInequality,
      ...bitnotPlugins,
      ...lowBitsPlugins,
      applyDeMorgans,
    ),

    required(
      pickAnyInt,
      forArgvToForEach,
      mapOps({
        right_align: (a, b) =>
          func(
            "format",
            op["concat[Text]"](text("%"), intToDecOpOrText(b), text("s")),
            a,
          ),
        int_to_hex_aligned: (a, b) =>
          func(
            "format",
            op["concat[Text]"](text("%0"), intToDecOpOrText(b), text("x")),
            a,
          ),
        int_to_Hex_aligned: (a, b) =>
          func(
            "format",
            op["concat[Text]"](text("%0"), intToDecOpOrText(b), text("X")),
            a,
          ),
      }),
    ),
    simplegolf(implicitlyConvertConcatArg),
    required(
      mapOps({
        append: (a, b) => func("conj", func("vec", a), b),
        "last[List]": (a) => func("last", a),
        pow: (a, b) => func("int", func("Math/pow", a, b)),
      }),
      mapOpsTo.builtin({
        true: "true",
        false: "false",
        argv: "*command-line-args*",
      }),
      mapBackwardsIndexToForwards({
        "at_back[Ascii]": "size[Ascii]",
        "at_back[codepoint]": "size[codepoint]",
        "at_back[List]": "size[List]",
        "with_at_back[List]": "size[List]",
      }),
      mapOps({
        bool_to_int: (a) => conditional(a, int(1n), int(0n)),
        int_to_bool: (a) => op["neq[Int]"](a, int(0n)),
        int_to_hex: (a) => func("format", text("%x"), a),
        int_to_Hex: (a) => func("format", text("%X"), a),

        "char[codepoint]": (a) => func("str", func("char", a)),
        "ord_at[codepoint]": (a, b) => func("int", func("nth", a, b)),
        "ord[codepoint]": (a) => func("int", func("nth", a, int(0))),
        "at[codepoint]": (a, b) => func("str", func("nth", a, b)),
        "slice[codepoint]": (a, b, c) => func("subs", a, b, op.add(b, c)),
        "slice[List]": (a, b, c) =>
          func("subvec", func("vec", a), b, op.add(b, c)),
        repeat: (a, b) => func("apply", builtin("str"), func("repeat", b, a)),
      }),
      mapOpsTo.func({
        is_even: "even?",
        is_odd: "odd?",
      }),
      divToTruncdiv,
      mapOpsTo.func({
        split: ".split",
        replace: "clojure.string/replace",

        abs: "abs",

        add: "+",
        sub: "-",
        mul: "*",
        rem: "rem",
        mod: "mod",
        trunc_div: "quot",
        neg: "-",

        and: "and",
        not: "not",
        or: "or",

        bit_and: "bit-and",
        bit_not: "bit-not",
        bit_or: "bit-or",
        bit_shift_left: "bit-shift-left",
        bit_shift_right: "bit-shift-right",
        bit_xor: "bit-xor",
        bit_count: "Long/bitCount",

        dec_to_int: "read-string",
        int_to_dec: "str",
        join: flipped`clojure.string/join`,

        geq: ">=",
        gt: ">",
        leq: "<=",
        lt: "<",

        max: "max",
        min: "min",

        "find[codepoint]": "clojure.string/index-of",
        "concat[Text]": "str",
        "concat[List]": "concat",
        "contains[Text]": "clojure.string/includes?",
        "contains[Table]": "contains?",
        "at[List]": "nth",
        "at[Table]": "",
        "eq[Int]": "=",
        "eq[Text]": "=",
        "size[codepoint]": "count",
        "size[List]": "count",
        "size[Table]": "count",
        "neq[Int]": "not=",
        "neq[Text]": "not=",
        "println[Int]": "prn",
        "println[Text]": "println",
        "print[Int]": "pr",
        "print[Text]": "print",
        "reversed[codepoint]": "clojure.string/reverse",
        "reversed[List]": "reverse",
        "sorted[Ascii]": "sort",
        "sorted[Int]": "sort",
        starts_with: "clojure.string/starts-with?",
        ends_with: "clojure.string/ends-with?",
      }),
      clone((node, type) => {
        if (["boolean", "integer", "text"].includes(type.kind)) {
          return node;
        }
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
    required(renameIdents(), removeImplicitConversions, assertInt64),
  ],
};

export default clojureLanguage;
