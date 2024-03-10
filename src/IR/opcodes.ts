import {
  type Node,
  type Literal,
  type Op,
  op,
  int as intNode,
  isOp,
  isInt,
  isNegative,
} from "./IR";
import {
  type Type,
  typeArg,
  textType as text,
  listType as list,
  arrayType as array,
  booleanType as bool,
  integerType as int,
  setType as set,
  tableType as table,
  asciiType as ascii,
} from "./types";

interface OpCodeDefinition {
  args: AnyOpCodeArgTypes;
  front?: true | string;
  assoc?: true;
  commutes?: true;
}

interface VirtualOpCodeDefinition<T extends AnyOpCode> {
  getArgs: (node: Op) => OpCodeArgValues<T> | undefined;
  construct: (...args: OpCodeArgValues<T>) => Op;
}

export interface Rest<T extends Type = Type> {
  rest: T;
}
export type AnyOpCodeArgTypes =
  | readonly [...(readonly Type[])]
  | readonly [...(readonly Type[]), Rest];
function rest<T extends Type>(rest: T): Rest<T> {
  return { rest };
}

const T1 = typeArg("T1");
const T2 = typeArg("T2");

function atLeast2<T extends Type>(type: T): [T, T, Rest<T>] {
  return [type, type, rest(type)];
}
export const opCodeDefinitions = {
  // Arithmetic
  is_even: { args: [int()], front: true },
  is_odd: { args: [int()], front: true },
  succ: { args: [int()], front: true },
  pred: { args: [int()], front: true },
  add: { args: atLeast2(int()), front: "+", assoc: true, commutes: true },
  sub: { args: [int(), int()], front: "-" },
  mul: { args: atLeast2(int()), front: "*", assoc: true, commutes: true },
  div: { args: [int(), int()], front: "div" },
  trunc_div: { args: [int(), int()] },
  unsigned_trunc_div: { args: [int(), int()] },
  pow: { args: [int(), int(0)], front: "^" },
  mod: { args: [int(), int()], front: "mod" },
  rem: { args: [int(), int()] },
  unsigned_rem: { args: [int(), int()] },
  bit_and: { args: atLeast2(int()), front: "&", assoc: true, commutes: true },
  bit_or: { args: atLeast2(int()), front: "|", assoc: true, commutes: true },
  bit_xor: { args: atLeast2(int()), front: "~", assoc: true, commutes: true },
  bit_shift_left: { args: [int(), int(0)], front: "<<" },
  bit_shift_right: { args: [int(), int(0)], front: ">>" },
  gcd: { args: atLeast2(int()), front: true, assoc: true, commutes: true },
  min: { args: atLeast2(int()), front: true, assoc: true, commutes: true },
  max: { args: atLeast2(int()), front: true, assoc: true, commutes: true },
  neg: { args: [int()], front: "-" },
  abs: { args: [int()], front: true },
  bit_not: { args: [int()], front: "~" },
  bit_count: { args: [int(0)], front: true },

  // Input
  "read[codepoint]": { args: [] },
  "read[byte]": { args: [] },
  "read[Int]": { args: [] },
  "read[line]": { args: [], front: true },
  "at[argv]": { args: [int(0)], front: "@" },
  argv: { args: [] },
  argc: { args: [] },

  // Output
  "print[Text]": { args: [text()], front: "print" },
  "print[Int]": { args: [int()], front: "print" },
  "println[Text]": { args: [text()], front: "println" },
  "println[Int]": { args: [int()], front: "println" },
  println_list_joined: { args: [list(text()), text()] },
  println_many_joined: { args: [text(), text(), rest(text())] },
  "putc[byte]": { args: [int(0, 255)], front: true },
  "putc[codepoint]": { args: [int(0, 0x10ffff)], front: true },
  "putc[Ascii]": { args: [int(0, 127)], front: "putc" },

  // Bool arithmetic
  or: { args: atLeast2(bool), front: true, assoc: true, commutes: true },
  and: { args: atLeast2(bool), front: true, assoc: true, commutes: true },
  unsafe_or: { args: [bool, bool], front: true, assoc: true },
  unsafe_and: { args: [bool, bool], front: true },
  not: { args: [bool], front: true },
  true: { args: [], front: true },
  false: { args: [], front: true },

  // Comparison
  lt: { args: [int(), int()], front: "<" },
  leq: { args: [int(), int()], front: "<=" },
  geq: { args: [int(), int()], front: ">=" },
  gt: { args: [int(), int()], front: ">" },
  "eq[Int]": { args: [int(), int()], front: "==", commutes: true },
  "eq[Text]": { args: [text(), text()], front: "==", commutes: true },
  "neq[Int]": { args: [int(), int()], front: "!=", commutes: true },
  "neq[Text]": { args: [text(), text()], front: "!=", commutes: true },

  // Access members
  "at[Array]": { args: [array(T1, T2), T2], front: "@" },
  "at[List]": { args: [list(T1), int(0)], front: "@" },
  "at_back[List]": { args: [list(T1), int("-oo", -1)], front: "@" },
  "at[Table]": { args: [table(T1, T2), T1], front: "@" },
  "at[Ascii]": { args: [ascii, int(0)], front: "@" },
  "at_back[Ascii]": { args: [ascii, int("-oo", -1)], front: "@" },
  "at[byte]": { args: [text(), int(0)], front: true },
  "at_back[byte]": { args: [text(), int("-oo", -1)], front: true },
  "at[codepoint]": { args: [text(), int(0)], front: true },
  "at_back[codepoint]": { args: [text(), int("-oo", -1)], front: true },
  "with_at[Array]": { args: [array(T1, T2), T2, T1], front: "@" },
  "with_at[List]": { args: [list(T1), int(0), T1], front: "@" },
  "with_at_back[List]": { args: [list(T1), int("-oo", -1), T1], front: "@" },
  "with_at[Table]": { args: [table(T1, T2), T1, T2], front: "@" },

  // Slice
  "slice[codepoint]": { args: [text(), int(0), int(0)], front: true },
  "slice_back[codepoint]": {
    args: [text(), int("-oo", -1), int(0)],
    front: true,
  },
  "slice[byte]": { args: [text(), int(0), int(0)], front: true },
  "slice_back[byte]": { args: [text(), int("-oo", -1), int(0)], front: true },
  "slice[Ascii]": { args: [ascii, int(0), int(0)], front: "slice" },
  "slice_back[Ascii]": {
    args: [ascii, int("-oo", -1), int(0)],
    front: "slice",
  },
  "slice[List]": { args: [list(T1), int(0), int(0)], front: "slice" },
  "slice_back[List]": {
    args: [list(T1), int("-oo", -1), int(0)],
    front: "slice",
  },

  // Chars
  "ord_at[byte]": { args: [text(), int(0)] },
  "ord_at_back[byte]": { args: [text(), int("-oo", -1)] },
  "ord_at[codepoint]": { args: [text(), int(0)] },
  "ord_at_back[codepoint]": { args: [text(), int("-oo", -1)] },
  "ord_at[Ascii]": { args: [ascii, int(0)] },
  "ord_at_back[Ascii]": { args: [ascii, int("-oo", -1)] },
  "ord[byte]": { args: [text(int(1, 1))], front: true },
  "ord[codepoint]": { args: [text(int(1, 1))], front: true },
  "ord[Ascii]": { args: [text(int(1, 1), true)], front: "ord" },
  "char[byte]": { args: [int(0, 255)], front: true },
  "char[codepoint]": { args: [int(0, 0x10ffff)], front: true },
  "char[Ascii]": { args: [int(0, 127)], front: "char" },
  "text_to_list[byte]": { args: [text()], front: true },
  "text_to_list[codepoint]": { args: [text()], front: true },
  "text_to_list[Ascii]": { args: [ascii], front: "text_to_list" },

  // Order
  "sorted[Int]": { args: [list(int())], front: "sorted" },
  "sorted[Ascii]": { args: [list(ascii)], front: "sorted" },
  "reversed[byte]": { args: [text()], front: true },
  "reversed[codepoint]": { args: [text()], front: true },
  "reversed[Ascii]": { args: [ascii], front: "reversed" },
  "reversed[List]": { args: [list(T1)], front: "reversed" },
  "find[codepoint]": { args: [text(), text(int(1))], front: true },
  "find[byte]": { args: [text(), text(int(1))], front: true },
  "find[Ascii]": { args: [ascii, ascii], front: "find" },
  "find[List]": { args: [list(T1), T1], front: "find" },

  // Membership
  "contains[Array]": { args: [array(T1, T2), T1], front: "contains" },
  "contains[List]": { args: [list(T1), T1], front: "contains" },
  "contains[Table]": { args: [table(T1, T2), T1], front: "contains" },
  "contains[Set]": { args: [set(T1), T1], front: "contains" },
  "contains[Text]": { args: [text(), text()], front: "contains" },

  // Size
  "size[List]": { args: [list(T1)], front: "#" },
  "size[Set]": { args: [set(T1)], front: "#" },
  "size[Table]": { args: [table(T1, T2)], front: "#" },
  "size[Ascii]": { args: [ascii], front: "#" },
  "size[codepoint]": { args: [text()], front: true },
  "size[byte]": { args: [text()], front: true },

  // Adding items
  include: { args: [set(T1), T1], front: true },
  append: { args: [list(T1), T1], front: "+" },
  "concat[List]": { args: atLeast2(list(T1)), front: "+", assoc: true },
  "concat[Text]": { args: atLeast2(text()), front: "+", assoc: true },

  // Text ops
  repeat: { args: [text(), int(0)], front: true },
  split: { args: [text(), text()], front: true },
  split_whitespace: { args: [text()], front: true },
  join: { args: [list(text()), text()], front: true },
  right_align: { args: [text(), int(0)], front: true },
  replace: { args: [text(), text(int(1)), text()], front: true },
  text_multireplace: { args: [text(), text(), text(), rest(text())] },
  starts_with: { args: [text(), text()], front: true },
  ends_with: { args: [text(), text()], front: true },

  // Text / Bool <-> Int
  int_to_bin_aligned: { args: [int(0), int(0)], front: true },
  int_to_hex_aligned: { args: [int(0), int(0)], front: true },
  int_to_Hex_aligned: { args: [int(0), int(0)], front: true },
  int_to_dec: { args: [int()], front: true },
  int_to_bin: { args: [int(0)], front: true },
  int_to_hex: { args: [int(0)], front: true },
  int_to_Hex: { args: [int(0)], front: true },
  int_to_bool: { args: [int(0, 1)], front: true },
  dec_to_int: { args: [ascii], front: true },
  bool_to_int: { args: [bool], front: true },

  // Ranges
  range_incl: { args: [int(), int(), int(1)], front: ".." },
  range_excl: { args: [int(), int(), int(1)], front: "..<" },
  range_diff_excl: { args: [int(), int(0), int(1)] },
} as const satisfies Record<string, OpCodeDefinition>;

type AnyOpCode = keyof typeof opCodeDefinitions;

export const VirtualOpCodes = [
  "is_even",
  "is_odd",
  "succ",
  "pred",
  "sub",
  "neg",
  "at[byte]",
  "at[codepoint]",
  "at[Ascii]",
  "at_back[byte]",
  "at_back[codepoint]",
  "at_back[Ascii]",
  "at[argv]",
  "size[byte]",
  "size[codepoint]",
  "size[Ascii]",
  "ord_at[byte]",
  "ord_at[codepoint]",
  "ord_at[Ascii]",
  "ord_at_back[byte]",
  "ord_at_back[codepoint]",
  "ord_at_back[Ascii]",
] as const satisfies readonly AnyOpCode[];
export type VirtualOpCode = (typeof VirtualOpCodes)[number];

export const virtualOpCodeDefinitions = {
  is_even: {
    construct(x) {
      return op["eq[Int]"](intNode(0), op.mod(x, intNode(2)));
    },
    getArgs(node) {
      if (isOp("eq[Int]", "neq[Int]", "leq", "geq", "lt", "gt")(node)) {
        let [a, b] = node.args;
        if (isInt(0n, 1n)(b)) {
          [a, b] = [b, a];
        }
        if (isInt(0n, 1n)(a) && isOp.mod(b) && isInt(2n)(b.args[1])) {
          if (a.value === 0n) {
            if (isOp("eq[Int]", "leq")(node)) return [b.args[0]];
          } else {
            if (isOp("neq[Int]", "lt")(node)) return [b.args[0]];
          }
        }
      }
    },
  },
  is_odd: {
    construct(x) {
      return op["eq[Int]"](intNode(1), op.mod(x, intNode(2)));
    },
    getArgs(node) {
      if (isOp("eq[Int]", "neq[Int]", "leq", "geq", "lt", "gt")(node)) {
        let [a, b] = node.args;
        if (isInt(0n, 1n)(b)) {
          [a, b] = [b, a];
        }
        if (isInt(0n, 1n)(a) && isOp.mod(b) && isInt(2n)(b.args[1])) {
          if (a.value === 0n) {
            if (isOp("neq[Int]", "gt")(node)) return [b.args[0]];
          } else {
            if (isOp("eq[Int]", "geq")(node)) return [b.args[0]];
          }
        }
      }
    },
  },
  succ: {
    construct(x) {
      return op.add(intNode(1), x);
    },
    getArgs(node) {
      if (isOp.add(node) && node.args.length > 1 && isInt(1n)(node.args[0])) {
        return [op.unsafe("add")(...node.args.slice(1))];
      }
    },
  },
  pred: {
    construct(x) {
      return op.add(intNode(1), x);
    },
    getArgs(node) {
      if (
        node.op === "add" &&
        node.args.length > 1 &&
        isInt(-1n)(node.args[0]!)
      ) {
        return [op.unsafe("add")(...node.args.slice(1))];
      }
    },
  },
  sub: {
    construct(a, b) {
      return op.add(a, op.mul(intNode(-1), b));
    },
    getArgs(node) {
      if (node.op === "add") {
        const exprs = node.args;
        let positiveArgs = exprs.filter((x) => !isNegative(x));
        let negativeArgs = exprs.filter((x) => isNegative(x));
        if (positiveArgs.length < 1) {
          positiveArgs = [negativeArgs[0]];
          negativeArgs = negativeArgs.slice(1);
        }
        const positive =
          positiveArgs.length > 1
            ? op.unsafe("add")(...positiveArgs)
            : positiveArgs[0];
        if (negativeArgs.length > 0) {
          return [
            positive,
            op.unsafe("add")(
              ...negativeArgs.map(
                (x) =>
                  ({
                    ...op.mul(intNode(-1), x),
                    targetType: x.targetType,
                  }) as any,
              ),
            ),
          ];
        }
      }
    },
  },
  neg: {
    construct(x) {
      return op.mul(intNode(-1), x);
    },
    getArgs(node) {
      if (isOp.mul(node) && isInt(-1n)(node.args[0])) {
        return [op.unsafe("mul")(...node.args.slice(1))];
      }
    },
  },
  "at[byte]": {
    construct(data, index) {
      return op["at[List]"](op["text_to_list[byte]"](data), index);
    },
    getArgs(node) {
      if (isOp["at[List]"](node) && isOp["text_to_list[byte]"](node.args[0])) {
        return [node.args[0].args[0], node.args[1]];
      }
    },
  },
  "at[codepoint]": {
    construct(data, index) {
      return op["at[List]"](op["text_to_list[codepoint]"](data), index);
    },
    getArgs(node) {
      if (
        isOp["at[List]"](node) &&
        isOp["text_to_list[codepoint]"](node.args[0])
      ) {
        return [node.args[0].args[0], node.args[1]];
      }
    },
  },
  "at[Ascii]": {
    construct(data, index) {
      return op["at[List]"](op["text_to_list[Ascii]"](data), index);
    },
    getArgs(node) {
      if (isOp["at[List]"](node) && isOp["text_to_list[Ascii]"](node.args[0])) {
        return [node.args[0].args[0], node.args[1]];
      }
    },
  },
  "at_back[byte]": {
    construct(data, index) {
      return op["at_back[List]"](op["text_to_list[byte]"](data), index);
    },
    getArgs(node) {
      if (
        isOp["at_back[List]"](node) &&
        isOp["text_to_list[byte]"](node.args[0])
      ) {
        return [node.args[0].args[0], node.args[1]];
      }
    },
  },
  "at_back[codepoint]": {
    construct(data, index) {
      return op["at_back[List]"](op["text_to_list[codepoint]"](data), index);
    },
    getArgs(node) {
      if (
        isOp["at_back[List]"](node) &&
        isOp["text_to_list[codepoint]"](node.args[0])
      ) {
        return [node.args[0].args[0], node.args[1]];
      }
    },
  },
  "at_back[Ascii]": {
    construct(data, index) {
      return op["at_back[List]"](op["text_to_list[Ascii]"](data), index);
    },
    getArgs(node) {
      if (
        isOp["at_back[List]"](node) &&
        isOp["text_to_list[Ascii]"](node.args[0])
      ) {
        return [node.args[0].args[0], node.args[1]];
      }
    },
  },
  "at[argv]": {
    construct(index) {
      return op["at[List]"](op.argv, index);
    },
    getArgs(node) {
      if (isOp["at[List]"](node) && isOp.argv(node.args[0])) {
        return [node.args[1]];
      }
    },
  },
  "size[byte]": {
    construct(data) {
      return op["size[List]"](op["text_to_list[byte]"](data));
    },
    getArgs(node) {
      if (
        isOp["size[List]"](node) &&
        isOp["text_to_list[byte]"](node.args[0])
      ) {
        return [node.args[0].args[0]];
      }
    },
  },
  "size[codepoint]": {
    construct(data) {
      return op["size[List]"](op["text_to_list[codepoint]"](data));
    },
    getArgs(node) {
      if (
        isOp["size[List]"](node) &&
        isOp["text_to_list[codepoint]"](node.args[0])
      ) {
        return [node.args[0].args[0]];
      }
    },
  },
  "size[Ascii]": {
    construct(data) {
      return op["size[List]"](op["text_to_list[Ascii]"](data));
    },
    getArgs(node) {
      if (
        isOp["size[List]"](node) &&
        isOp["text_to_list[Ascii]"](node.args[0])
      ) {
        return [node.args[0].args[0]];
      }
    },
  },
  "ord_at[byte]": {
    construct(text, index) {
      return op["ord[byte]"](op["at[byte]"](text, index));
    },
    getArgs(node) {
      if (
        isOp["ord[byte]"](node) &&
        isOp["at[List]"](node.args[0]) &&
        isOp["text_to_list[byte]"](node.args[0].args[0])
      ) {
        return [node.args[0].args[0].args[0], node.args[0].args[1]];
      }
    },
  },
  "ord_at[codepoint]": {
    construct(text, index) {
      return op["ord[codepoint]"](op["at[codepoint]"](text, index));
    },
    getArgs(node) {
      if (
        isOp["ord[codepoint]"](node) &&
        isOp["at[List]"](node.args[0]) &&
        isOp["text_to_list[codepoint]"](node.args[0].args[0])
      ) {
        return [node.args[0].args[0].args[0], node.args[0].args[1]];
      }
    },
  },
  "ord_at[Ascii]": {
    construct(text, index) {
      return op["ord[Ascii]"](op["at[Ascii]"](text, index));
    },
    getArgs(node) {
      if (
        isOp["ord[Ascii]"](node) &&
        isOp["at[List]"](node.args[0]) &&
        isOp["text_to_list[Ascii]"](node.args[0].args[0])
      ) {
        return [node.args[0].args[0].args[0], node.args[0].args[1]];
      }
    },
  },
  "ord_at_back[byte]": {
    construct(text, index) {
      return op["ord[byte]"](op["at_back[byte]"](text, index));
    },
    getArgs(node) {
      if (
        isOp["ord[byte]"](node) &&
        isOp["at_back[List]"](node.args[0]) &&
        isOp["text_to_list[byte]"](node.args[0].args[0])
      ) {
        return [node.args[0].args[0].args[0], node.args[0].args[1]];
      }
    },
  },
  "ord_at_back[codepoint]": {
    construct(text, index) {
      return op["ord[codepoint]"](op["at_back[codepoint]"](text, index));
    },
    getArgs(node) {
      if (
        isOp["ord[codepoint]"](node) &&
        isOp["at_back[List]"](node.args[0]) &&
        isOp["text_to_list[codepoint]"](node.args[0].args[0])
      ) {
        return [node.args[0].args[0].args[0], node.args[0].args[1]];
      }
    },
  },
  "ord_at_back[Ascii]": {
    construct(text, index) {
      return op["ord[Ascii]"](op["at_back[Ascii]"](text, index));
    },
    getArgs(node) {
      if (
        isOp["ord[Ascii]"](node) &&
        isOp["at_back[List]"](node.args[0]) &&
        isOp["text_to_list[Ascii]"](node.args[0].args[0])
      ) {
        return [node.args[0].args[0].args[0], node.args[0].args[1]];
      }
    },
  },
} as const satisfies {
  [T in VirtualOpCode]?: VirtualOpCodeDefinition<T>;
};

export type OpCodeArgTypes<T extends OpCode = OpCode> =
  (typeof opCodeDefinitions)[T]["args"];

type ValuesOfLengthOf<T extends readonly [...unknown[]]> = {
  [K in keyof T]: Node;
};

export type OpCodeArgValues<
  O extends OpCode = OpCode,
  Types extends OpCodeArgTypes<O> = OpCodeArgTypes<O>,
> = Types extends readonly [...infer T, Rest]
  ? [...ValuesOfLengthOf<T>, ...(readonly Node[])]
  : ValuesOfLengthOf<Types>;

export const opCodeDescriptions: Record<AnyOpCode, string> = {
  is_even: "Evenness predicate.",
  is_odd: "Oddness predicate.",
  succ: "Integer successor.",
  pred: "Integer predecessor.",
  add: "Integer addition.",
  sub: "Integer subtraction.",
  mul: "Integer multiplication.",
  div: "Integer floor division.",
  trunc_div: "Integer truncating (towards zero) division.",
  unsigned_trunc_div:
    "Integer truncating division treating the operands as unsigned.",
  pow: "Integer exponentiation.",
  mod: "Integer modulo (corresponds to `div`).",
  rem: "Integer remainder (corresponds to `trunc_div`).",
  unsigned_rem:
    "Integer unsigned remainder (corresponds to `unsigned_trunc_div`).",
  bit_and: "Integer bitwise and.",
  bit_or: "Integer bitwise or.",
  bit_xor: "Integer bitwise xor.",
  bit_shift_left: "Integer left bitshift.",
  bit_shift_right: "Integer arithmetic right bitshift.",
  gcd: "Greatest common divisor of two integers.",
  min: "Integer minimum.",
  max: "Integer maximum.",
  neg: "Integer negation.",
  abs: "Integer absolute value.",
  bit_not: "Integer bitwise not.",
  bit_count: "Number of set bits in the integer.",

  // Input
  "read[codepoint]": "Reads single codepoint from the stdin.",
  "read[byte]": "Reads single byte from the stdin.",
  "read[Int]": "Reads single signed integer from the stdin.",
  "read[line]": "Reads single line from the stdin.",
  "at[argv]":
    "Gets argv at the 0-based `n`th position, where `n` is an integer literal.",
  argv: "Gets argv as a list.",
  argc: "Gets the length of argv.",

  // Output
  "print[Text]": "Prints the provided argument.",
  "print[Int]": "Converts the provided argument to base 10 text and prints it.",
  "println[Text]": "Prints the provided argument followed by a \\n.",
  "println[Int]":
    "Converts the provided argument to base 10 text and prints it followed by a \\n.",
  println_list_joined:
    "Joins the items in the list using the delimiter and prints the result.",
  println_many_joined:
    "Joins the items in the list using the delimiter and prints the result.",
  "putc[byte]": "Creates a single byte text and prints it.",
  "putc[codepoint]": "Creates a single codepoint text and prints it.",
  "putc[Ascii]": "Creates a single ascii character text and prints it.",

  // Bool arithmetic
  or: "Non-shortcircuiting logical or. All arguments are to be safely evaluated in any order.",
  and: "Non-shortcircuiting logical and. All arguments are to be safely evaluated in any order.",
  unsafe_or: "Shortcircuiting logical or.",
  unsafe_and: "Shortcircuiting logical and.",
  not: "Logical not.",
  true: "True value.",
  false: "False value.",

  // Comparison
  lt: "Integer less than.",
  leq: "Integer less than or equal.",
  geq: "Integer greater than or equal.",
  gt: "Integer greater than.",
  "eq[Int]": "Integer equality.",
  "eq[Text]": "Text equality.",
  "neq[Int]": "Integer inequality.",
  "neq[Text]": "Text inequality.",

  // Access members
  "at[Array]": "Gets the item at the 0-based index.",
  "at[List]": "Gets the item at the 0-based index.",
  "at_back[List]": "Gets the item at the -1-based backwards index.",
  "at[Table]": "Gets the item at the key.",
  "at[Ascii]": "Gets the character at the 0-based index.",
  "at_back[Ascii]": "Gets the character at the -1-based backwards index.",
  "at[byte]": "Gets the byte (as text) at the 0-based index (counting bytes).",
  "at_back[byte]":
    "Gets the byte (as text) at the -1-based backwards index (counting bytes).",
  "at[codepoint]":
    "Gets the codepoint (as text) at the 0-based index (counting codepoints).",
  "at_back[codepoint]":
    "Gets the codepoint (as text) at the -1-based backwards index (counting codepoints).",
  "with_at[Array]":
    "Returns an array with item at the given 0-based index replaced.",
  "with_at[List]":
    "Returns a list with item at the given 0-based index replaced.",
  "with_at_back[List]":
    "Returns a list with item at the given -1-based backwards index replaced.",
  "with_at[Table]": "Returns an array with item at the given key replaced.",

  // Slice
  "slice[codepoint]":
    "Returns a text slice that starts at the given 0-based index and has given length. Start and length are measured in codepoints.",
  "slice_back[codepoint]":
    "Returns a text slice that starts at the given -1-based backwards index and has given length. Start and length are measured in codepoints.",
  "slice[byte]":
    "Returns a text slice that starts at the given 0-based index and has given length. Start and length are measured in bytes.",
  "slice_back[byte]":
    "Returns a text slice that starts at the given -1-based backwards index and has given length. Start and length are measured in bytes.",
  "slice[Ascii]":
    "Returns a text slice that starts at the given 0-based index and has given length.",
  "slice_back[Ascii]":
    "Returns a text slice that starts at the given -1-based backwards index and has given length.",
  "slice[List]":
    "Returns a list slice that starts at the given 0-based index and has given length.",
  "slice_back[List]":
    "Returns a list slice that starts at the given -1-based backwards index and has given length.",

  // Chars
  "ord_at[byte]":
    "Gets the byte (as integer) at the 0-based index (counting bytes).",
  "ord_at_back[byte]":
    "Gets the byte (as integer) at the -1-based backwards index (counting bytes).",
  "ord_at[codepoint]":
    "Gets the codepoint (as integer) at the 0-based index (counting codepoints).",
  "ord_at_back[codepoint]":
    "Gets the codepoint (as integer) at the -1-based backwards index (counting codepoints).",
  "ord_at[Ascii]": "Gets the character (as integer) at the 0-based index.",
  "ord_at_back[Ascii]":
    "Gets the character (as integer) at the -1-based backwards index.",
  "ord[byte]": "Converts the byte to an integer.",
  "ord[codepoint]": "Converts the codepoint to an integer.",
  "ord[Ascii]": "Converts the character to an integer.",
  "char[byte]": "Returns a byte (as text) corresponding to the integer.",
  "char[codepoint]":
    "Returns a codepoint (as text) corresponding to the integer.",
  "char[Ascii]": "Returns a character corresponding to the integer.",
  "text_to_list[byte]":
    "Converts given text to a list of single byte texts. Use for[byte] to iterate over bytes in a text.",
  "text_to_list[codepoint]":
    "Converts given text to a list of single codepoint texts. Use for[codepoint] to iterate over codepoints in a text.",
  "text_to_list[Ascii]":
    "Converts given text to a list of single character texts. Use for[Ascii] to iterate over characters in a text.",

  // Order
  "sorted[Int]": "Returns a sorted copy of the input.",
  "sorted[Ascii]": "Returns a lexicographically sorted copy of the input.",
  "reversed[byte]": "Returns a text in which the bytes are in reversed order.",
  "reversed[codepoint]":
    "Returns a text in which the codepoints are in reversed order.",
  "reversed[Ascii]":
    "Returns a text in which the characters are in reversed order.",
  "reversed[List]": "Returns a list in which the items are in reversed order.",
  "find[codepoint]":
    "Returns a 0-based index of the first codepoint at which the search text starts, provided it is included.",
  "find[byte]":
    "Returns a 0-based index of the first byte at which the search text starts, provided it is included.",
  "find[Ascii]":
    "Returns a 0-based index of the first character at which the search text starts, provided it is included.",
  "find[List]":
    "Returns a 0-based index of the first occurence of the searched item, provided it is included.",

  // Membership
  "contains[Array]": "Asserts whether an item is included in the array.",
  "contains[List]": "Asserts whether an item is included in the list.",
  "contains[Table]":
    "Asserts whether an item is included in the keys of the table.",
  "contains[Set]": "Asserts whether an item is included in the set.",
  "contains[Text]":
    "Asserts whether the 2nd argument is a substring of the 1st one.",

  // Size
  "size[List]": "Returns the length of the list.",
  "size[Set]": "Returns the cardinality of the set.",
  "size[Table]": "Returns the number of keys in the table.",
  "size[Ascii]": "Returns the length of the text.",
  "size[codepoint]": "Returns the length of the text in codepoints.",
  "size[byte]": "Returns the length of the text in bytes.",

  // Adding items
  include: "Modifies the set by including the given item.",
  append: "Returns a new list with the given item appended at the end.",
  "concat[List]": "Returns a new list formed by concatenation of the inputs.",
  "concat[Text]": "Returns a new text formed by concatenation of the inputs.",

  // Text ops
  repeat: "Repeats the text a given amount of times.",
  split: "Splits the text by the delimiter.",
  split_whitespace: "Splits the text by any whitespace.",
  join: "Joins the items using the delimiter.",
  right_align: "Right-aligns the text using spaces to a minimum length.",
  replace: "Replaces all occurences of a given text with another text.",
  text_multireplace:
    "Performs simultaneos replacement of multiple pairs of texts.",
  starts_with: "Checks whether the second argument is a prefix of the first.",
  ends_with: "Checks whether the second argument is a suffix of the first.",

  // Text / Bool <-> Int
  int_to_bin_aligned:
    "Converts the integer to a 2-base text and alignes to a minimum length.",
  int_to_hex_aligned:
    "Converts the integer to a 16-base lowercase text and aligns to a minimum length.",
  int_to_Hex_aligned:
    "Converts the integer to a 16-base uppercase text and aligns to a minimum length.",
  int_to_dec: "Converts the integer to a 10-base text.",
  int_to_bin: "Converts the integer to a 2-base text.",
  int_to_hex: "Converts the integer to a 16-base lowercase text.",
  int_to_Hex: "Converts the integer to a 16-base uppercase text.",
  int_to_bool: "Converts 0 to false and 1 to true.",
  dec_to_int: "Parses a integer from a 10-base text.",
  bool_to_int: "Converts false to 0 and true to 1.",

  range_incl:
    "List of integers between given inclusive bounds, with given step.",
  range_excl:
    "List of integers between given inclusive lower, exclusive upper bound,  with given step.",
  range_diff_excl:
    "List of integers between given inclusive lower, exclusive upper bound expressed using a difference between the lower bound, with given step.",
};

const int0 = { kind: "Integer", value: 0n } as const;
const int1 = { kind: "Integer", value: 1n } as const;
const empty = { kind: "Text", value: "" } as const;

export const defaults: Partial<Record<OpCode, (Literal | undefined)[]>> = {
  range_incl: [int0, undefined, int1],
  range_excl: [int0, undefined, int1],
  join: [undefined, empty],
  replace: [undefined, undefined, empty],
};

export type OpCodeFrontName =
  | {
      [K in AnyOpCode]: (typeof opCodeDefinitions)[K] extends { front: string }
        ? (typeof opCodeDefinitions)[K]["front"]
        : K;
    }[AnyOpCode]
  | AnyOpCode;

export type OpCode<T extends Partial<OpCodeDefinition> = {}> = {
  [K in AnyOpCode]: (typeof opCodeDefinitions)[K] extends T ? K : never;
}[AnyOpCode] &
  string;
export type NullaryOpCode = OpCode<{ args: Readonly<[]> }>;
export type UnaryOpCode = OpCode<{ args: Readonly<[Type]> }>;
export type BinaryOpCode = OpCode<{ args: Readonly<[Type, Type]> }>;
export type TernaryOpCode = OpCode<{ args: Readonly<[Type, Type, Type]> }>;
export type VariadicOpCode = {
  [K in AnyOpCode]: OpCodeArgTypes<K> extends readonly [...Type[], Rest]
    ? K
    : never;
}[AnyOpCode];
export type AssociativeOpCode = OpCode<{ assoc: true }>;
export type CommutativeOpCode = OpCode<{ commutes: true }>;
export type ConversionOpCode = UnaryOpCode & `${string}_${string}`;

export function isNullary(op: OpCode): op is NullaryOpCode {
  return maxArity(op) === 0;
}
export function isUnary(op: OpCode): op is UnaryOpCode {
  return maxArity(op) === 1;
}
export function isBinary(op: OpCode): op is BinaryOpCode {
  return maxArity(op) === 2;
}
export function isTernary(op: OpCode): op is TernaryOpCode {
  return maxArity(op) === 3;
}
export function isVariadic(op: OpCode): op is VariadicOpCode {
  return maxArity(op) === Infinity;
}
export function isAssociative(op: OpCode): op is AssociativeOpCode {
  return (opCodeDefinitions[op] as any)?.assoc === true;
}
export function isCommutative(op: OpCode): op is CommutativeOpCode {
  return (opCodeDefinitions[op] as any)?.commutes === true;
}

export const OpCodes = Object.keys(opCodeDefinitions) as OpCode[];
export const NullaryOpCodes = OpCodes.filter(isNullary);
export const UnaryOpCodes = OpCodes.filter(isUnary);
export const BinaryOpCodes = OpCodes.filter(isBinary);
export const TernaryOpCodes = OpCodes.filter(isTernary);
export const VariadicOpCodes = OpCodes.filter(isVariadic);
export const AssociativeOpCodes = OpCodes.filter(isAssociative);
export const CommutativeOpCodes = OpCodes.filter(isCommutative);

export function isOpCode(op: string): op is OpCode {
  return op in opCodeDefinitions;
}

export type PhysicalOpCode = Exclude<AnyOpCode, VirtualOpCode>;

export const PhysicalOpCodes = OpCodes.filter(
  (x) => !isVirtualOpCode(x),
) as PhysicalOpCode[];

export function isVirtualOpCode(op: string): op is VirtualOpCode {
  return op in virtualOpCodeDefinitions;
}
export function isPhysicalOpCode(op: string): op is PhysicalOpCode {
  return !isVirtualOpCode(op);
}

export const OpCodeFrontNames = [
  ...new Set([
    ...Object.entries(opCodeDefinitions).map(([k, v]) =>
      "front" in v && typeof v.front === "string" ? v.front : k,
    ),
    ...OpCodes,
  ]),
];

export const OpCodeFrontNamesToOpCodes = Object.fromEntries(
  OpCodeFrontNames.map((frontName) => [
    frontName,
    OpCodes.filter(
      (op) =>
        op === frontName || (opCodeDefinitions[op] as any).front === frontName,
    ),
  ]),
) as Record<OpCodeFrontName, OpCode[]>;

export const OpCodesUser = OpCodes.filter(
  (op) => "front" in opCodeDefinitions[op],
);

export function userName(opCode: OpCode) {
  if ("front" in opCodeDefinitions[opCode]) {
    return typeof (opCodeDefinitions[opCode] as any).front === "string"
      ? (opCodeDefinitions[opCode] as any).front
      : opCode;
  }
}

/**
 * Returns maximum arity of an op.
 */
export function maxArity(op: OpCode): number {
  const args = opCodeDefinitions[op].args;
  if (args.length > 0 && "rest" in args.at(-1)!) return Infinity;
  return args.length;
}

export function minArity(op: OpCode): number {
  const args = opCodeDefinitions[op].args;
  if (maxArity(op) === Infinity) return args.length - 1;
  return (
    args.length - (defaults[op] ?? []).filter((x) => x !== undefined).length
  );
}

/**
 * Maps a binary op to another one with the same meaning, except the order of the arguments is swapped.
 * This should only be used for ops that are *not* associative or commutative.
 */
export const flippedOpCode = {
  lt: "gt",
  gt: "lt",
  leq: "geq",
  geq: "leq",
} as const satisfies Partial<Record<BinaryOpCode, BinaryOpCode>>;

export const booleanNotOpCode = {
  "eq[Int]": "neq[Int]",
  "eq[Text]": "neq[Text]",
  "neq[Int]": "eq[Int]",
  "neq[Text]": "eq[Text]",
  lt: "geq",
  gt: "leq",
  leq: "gt",
  geq: "lt",
} as const satisfies Partial<Record<BinaryOpCode, BinaryOpCode>>;

export const inverseOpCode = {
  bool_to_int: "int_to_bool",
  int_to_bool: "bool_to_int",
  int_to_dec: "dec_to_int",
  not: "not",
  bit_not: "bit_not",
} as const satisfies Partial<Record<UnaryOpCode, UnaryOpCode>>;
