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
  isInt,
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

const janetLanguage: Language = {
  name: "Janet",
  extension: "janet",
  emitter: emitProgram,
  phases: [
    required(arraysToLists, putcToPrintChar, usePrimaryTextOps("byte")),
    simplegolf(golfLastPrint(false), golfLastPrintInt(true)),
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
        right_align: (x) =>
          func(
            "string/format",
            op["concat[Text]"](text("%"), op.int_to_dec(x[1]), text("s")),
            x[0],
          ),
        int_to_hex_aligned: (x) =>
          func(
            "string/format",
            op["concat[Text]"](text("%0"), op.int_to_dec(x[1]), text("X")),
            x[0],
          ),
      }),
    ),
    simplegolf(implicitlyConvertConcatArg),
    required(
      mapOps({
        argv: func("slice", func("dyn", builtin(":args")), int(1n)),

        append: (x) => op["concat[List]"](x[0], list([x[1]])),

        "at[argv]": (x) =>
          op["at[List]"](func("dyn", builtin(":args")), succ(x[0])),
        "at[byte]": (x) => op["slice[byte]"](x[0], x[1], int(1n)),
        "contains[Text]": (x) => func("int?", op["find[byte]"](x[0], x[1])),
        "contains[Table]": (x) =>
          op.not(func("nil?", op["at[Table]"](x[0], x[1]))),
      }),
      mapOps({
        "at_back[List]": ([a, b]) =>
          isInt(-1n)(b) ? func("last", a) : undefined,
      }),
      mapBackwardsIndexToForwards({
        "at_back[Ascii]": "size[Ascii]",
        "at_back[byte]": "size[byte]",
        "at_back[codepoint]": "size[codepoint]",
        "at_back[List]": "size[List]",
        "with_at_back[List]": "size[List]",
      }),
      mapOps({
        bool_to_int: (x) => conditional(x[0], int(1n), int(0n)),
        int_to_bool: (x) => op["neq[Int]"](x[0], int(0n)),
        int_to_hex: (x) => func("string/format", text("%X"), x[0]),
        split: (x) => func("string/split", x[1], x[0]),

        "char[byte]": (x) => func("string/format", text("%c"), x[0]),
        "concat[List]": (x) => func("array/concat", list([]), ...x),
        "find[byte]": (x) => func("string/find", x[1], x[0]),
        "ord[byte]": (x) => op["ord_at[byte]"](x[0], int(0n)),
        "slice[byte]": (x) =>
          rangeIndexCall(x[0], x[1], op.add(x[1], x[2]), int(1n)),
        "slice[List]": (x) =>
          rangeIndexCall(x[0], x[1], op.add(x[1], x[2]), int(1n)),
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
        replace: "string/replace-all",
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

        "at[List]": "",
        "at[Table]": "",
        "eq[Int]": "=",
        "eq[Text]": "=",
        "size[byte]": "length",
        "size[List]": "length",
        "size[Table]": "length",
        "neq[Int]": "not=",
        "neq[Text]": "not=",
        "ord_at[byte]": "",
        "println[Int]": "pp",
        "println[Text]": "print",
        "print[Int]": "prin",
        "print[Text]": "prin",
        "reversed[byte]": "reverse",
        "reversed[List]": "reverse",
        "sorted[Ascii]": "sorted",
        "sorted[Int]": "sorted",
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
    required(
      renameIdents(),
      addVarDeclarations,
      removeImplicitConversions,
      assertInt64,
    ),
  ],
  detokenizer: defaultDetokenizer(
    (a, b) =>
      a !== "" &&
      b !== "" &&
      /[^(){}[\]`'"]/.test(a[a.length - 1]) &&
      /[^(){}[\]`'"]/.test(b[0]),
  ),
};

export default janetLanguage;
