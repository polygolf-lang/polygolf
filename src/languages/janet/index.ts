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
  mapOps,
  mapTo,
  removeImplicitConversions,
} from "../../plugins/ops";
import { addVarDeclarations } from "../../plugins/block";
import {
  add1,
  builtin,
  conditional,
  functionCall as func,
  int,
  list,
  op,
  text,
} from "../../IR";
import { golfLastPrint, putcToPrintChar } from "../../plugins/print";
import { usePrimaryTextOps } from "../../plugins/textOps";
import { golfStringListLiteral, listOpsToTextOps } from "../../plugins/static";
import {
  applyDeMorgans,
  bitnotPlugins,
  equalityToInequality,
  lowBitsPlugins,
  pickAnyInt,
} from "../../plugins/arithmetic";
import { forArgvToForEach } from "../../plugins/loops";
import { renameIdents } from "../../plugins/idents";

const janetLanguage: Language = {
  name: "Janet",
  extension: "janet",
  emitter: emitProgram,
  phases: [
    required(arraysToLists, putcToPrintChar),
    simplegolf(golfLastPrint()),
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
      usePrimaryTextOps("byte"),
      pickAnyInt,
      forArgvToForEach,
      mapOps({
        argv: func("slice", func("dyn", builtin(":args")), int(1n)),

        append: (x) => op("concat[List]", x[0], list([x[1]])),

        "at[argv]": (x) =>
          op("at[List]", func("dyn", builtin(":args")), add1(x[0])),
        "at[byte]": (x) => op("slice[byte]", x[0], x[1], int(1n)),
        "contains[Text]": (x) => func("int?", op("find[byte]", x[0], x[1])),
        "contains[Table]": (x) =>
          op("not", func("nil?", op("at[Table]", x[0], x[1]))),
      }),
      mapOps({
        true: builtin("true"),
        false: builtin("false"),

        bool_to_int: (x) => conditional(x[0], int(1n), int(0n)),
        int_to_bool: (x) => op("neq[Int]", x[0], int(0n)),
        int_to_hex: (x) => func("string/format", text("%X"), x[0]),
        split: (x) => func("string/split", x[1], x[0]),

        "char[byte]": (x) => func("string/format", text("%c"), x[0]),
        "concat[List]": (x) => func("array/concat", list([]), ...x),
        "find[byte]": (x) => func("string/find", x[1], x[0]),
        "ord[byte]": (x) => op("ord_at[byte]", x[0], int(0n)),
        "slice[byte]": (x) => func("slice", x[0], x[1], op("add", x[1], x[2])),
        "slice[List]": (x) => func("slice", x[0], x[1], op("add", x[1], x[2])),
      }),
      mapTo(func)({
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
        div: "div",
        gcd: "math/gcd",
        geq: ">=",
        gt: ">",
        int_to_dec: "string",
        join: "string/join",
        leq: "<=",
        lt: "<",
        max: "max",
        min: "min",
        mod: "%",
        mul: "*",
        neg: "-",
        not: "not",
        or: "or",
        pow: "math/pow",
        push: "array/push",
        repeat: "string/repeat",
        replace: "string/replace-all",

        "at[List]": "",
        "at[Table]": "",
        "concat[Text]": "string",
        "eq[Int]": "=",
        "eq[Text]": "=",
        "set_at[List]": "put",
        "set_at[Table]": "put",
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
      addVarDeclarations,
    ),
    required(renameIdents(), removeImplicitConversions),
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
