import {
  type Language,
  required,
  defaultDetokenizer,
  simplegolf,
  search,
} from "../../common/Language";
import emitProgram from "./emit";
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
  isInt,
  intToDecOpOrText,
} from "../../IR";
import {
  golfLastPrint,
  golfLastPrintInt,
  putcToPrintChar,
} from "../../plugins/print";
import { usePrimaryTextOps } from "../../plugins/textOps";
import { golfStringListLiteral, listOpsToTextOps } from "../../plugins/static";
import {
  applyDeMorgans,
  bitnotPlugins,
  equalityToInequality,
  lowBitsPlugins,
  pickAnyInt,
  truncatingOpsPlugins,
} from "../../plugins/arithmetic";
import { forArgvToForEach } from "../../plugins/loops";
import { alias, renameIdents } from "../../plugins/idents";
import { assertInt64 } from "../../plugins/types";
import { implicitlyConvertConcatArg } from "./plugins";

const clojureLanguage: Language = {
  name: "Clojure",
  extension: "clj",
  emitter: emitProgram,
  phases: [
    required(arraysToLists, putcToPrintChar, usePrimaryTextOps("codepoint")),
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
        argv: () => builtin("*command-line-args*"),

        // TODO: vec not necessary if already a vec
        append: (a, b) => func("conj", a, b),

        "at[argv]": (a) => op["at[List]"](builtin("*command-line-args*"), a),
        "at[codepoint]": (a, b) => func("int", func("nth", a, b)),
        "contains[Text]": (a, b) => func("clojure.string/includes?", a, b),
        "contains[Table]": (a, b) => func("contains?", a, b),
        "ord[codepoint]": (a) => op["ord_at[codepoint]"](a, int(0n)),
        pow: (a, b) => func("int", func("Math/pow", a, b)),
      }),
      mapOps({
        "at_back[List]": (a, b) =>
          isInt(-1n)(b) ? func("last", a) : undefined,
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
        "concat[List]": (...x) => func("concat", ...x),
        "ord_at[codepoint]": (a, b) => func("int", func("nth", a, b)),
        "slice[codepoint]": (a, b, c) => func("subs", a, b, op.add(b, c)),
        "slice[List]": (a, b, c) =>
          func("subvec", func("vec", a), b, op.add(b, c)),
        repeat: (a, b) => func("apply", builtin("str"), func("repeat", b, a)),
      }),
      mapOpsTo.builtin({ true: "true", false: "false" }),
      mapOpsTo.func({
        is_even: "even?",
        is_odd: "odd?",
      }),
      ...truncatingOpsPlugins,
      mapOpsTo.func({
        split: ".split",
        "find[byte]": "clojure.string/index-of",
        replace: "clojure.string/replace",
        "concat[Text]": "str",
        abs: "abs",
        add: "+",
        and: "and",
        bit_and: "bit-and",
        bit_not: "bit-not",
        bit_or: "bit-or",
        bit_shift_left: "bit-shift-left",
        bit_shift_right: "bit-shift-right",
        bit_xor: "bit-xor",
        dec_to_int: "read-string",
        geq: ">=",
        gt: ">",
        int_to_dec: "str",
        join: flipped`clojure.string/join`,
        leq: "<=",
        lt: "<",
        max: "max",
        min: "min",
        mul: "*",
        neg: "-",
        not: "not",
        or: "or",
        rem: "rem",
        mod: "mod",
        sub: "-",
        trunc_div: "quot",

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
      }),
    ),
    simplegolf(
      alias({
        Identifier: (n, s) =>
          n.builtin && s.pathFragment !== "ident" ? n.name : undefined,
        Integer: (x) => x.value.toString(),
        Text: (x) => `"${x.value}"`,
      }),
    ),
    required(renameIdents(), removeImplicitConversions, assertInt64),
  ],
  detokenizer: defaultDetokenizer(
    (a, b) =>
      a !== "" &&
      b !== "" &&
      /[^(){}[\]"]/.test(a[a.length - 1]) &&
      /[^(){}[\]"]/.test(b[0]),
  ),
};

export default clojureLanguage;
