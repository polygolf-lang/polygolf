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
} from ".";

interface OpCodeDefinition {
  args: Readonly<ArgTypes>;
  front?: true | string;
  assoc?: true;
  commutes?: true;
}

interface Variadic {
  variadic: Type;
  min: number;
}
export type ArgTypes = Variadic | Type[];
function variadic(type: Type, min = 2): ArgTypes {
  return {
    variadic: type,
    min,
  };
}

const T1 = typeArg("T1");
const T2 = typeArg("T2");

export const opCodeDefinitions = {
  // Arithmetic
  add: { args: variadic(int()), front: true, assoc: true },
  sub: { args: [int(), int()], front: true },
  mul: { args: variadic(int()), front: true, assoc: true },
  div: { args: [int(), int()], front: true },
  trunc_div: { args: [int(), int()] },
  unsigned_trunc_div: { args: [int(), int()] },
  pow: { args: [int(), int()], front: true },
  mod: { args: [int(), int()], front: true },
  rem: { args: [int(), int()] },
  unsigned_rem: { args: [int(), int()] },
  bit_and: { args: variadic(int()), front: true, assoc: true },
  bit_or: { args: variadic(int()), front: true, assoc: true },
  bit_xor: { args: variadic(int()), front: true, assoc: true },
  bit_shift_left: { args: [int(), int()], front: true },
  bit_shift_right: { args: [int(), int()], front: true },
  gcd: { args: variadic(int()), front: true, assoc: true },
  min: { args: variadic(int()), front: true, assoc: true },
  max: { args: variadic(int()), front: true, assoc: true },
  neg: { args: [int()], front: true },
  abs: { args: [int()], front: true },
  bit_not: { args: [int()], front: true },

  // Input
  "read[codepoint]": { args: [] },
  "read[byte]": { args: [] },
  "read[Int]": { args: [] },
  "read[line]": { args: [], front: true },
  "at[argv]": { args: [int(0)], front: true },
  argv: { args: [] },
  argc: { args: [] },

  // Output
  "print[Text]": { args: [text()], front: "print" },
  "print[Int]": { args: [text()], front: "print" },
  "println[Text]": { args: [int()], front: "println" },
  "println[Int]": { args: [int()], front: "println" },
  println_list_joined: { args: [list(text()), text()] },
  println_many_joined: { args: variadic(text(), 2) },
  "putc[byte]": { args: [int(0, 255)], front: true },
  "putc[codepoint]": { args: [int(0, 0x10ffff)], front: true },
  "putc[Ascii]": { args: [int(0, 127)], front: "putc" },

  // Bool arithmetic
  or: { args: variadic(bool), front: true, assoc: true },
  and: { args: variadic(bool), front: true, assoc: true },
  unsafe_or: { args: variadic(bool), front: true, assoc: true },
  unsafe_and: { args: variadic(bool), front: true },
  not: { args: [bool], front: true },
  true: { args: [], front: true },
  false: { args: [], front: true },

  // Comparison
  lt: { args: [int(), int()], front: true },
  leq: { args: [int(), int()], front: true },
  geq: { args: [int(), int()], front: true },
  gt: { args: [int(), int()], front: true },
  "eq[Int]": { args: [int(), int()], front: true },
  "eq[Text]": { args: [text(), text()], front: true },
  "neq[Int]": { args: [int(), int()], front: true },
  "neq[Text]": { args: [text(), text()], front: true },

  // Access members
  "at[Array]": { args: [array(T1, T2), T2], front: "at" },
  "at[List]": { args: [list(T1), int(0)], front: "at" },
  "at[Table]": { args: [table(T1, T2), T1], front: "at" },
  "at[Ascii]": { args: [ascii, int(0)], front: "at" },
  "at[byte]": { args: [text(), int(0)], front: true },
  "at[codepoint]": { args: [text(), int(0)], front: true },
  "set_at[Array]": { args: [array(T1, T2), T2, T1], front: "set_at" },
  "set_at[List]": { args: [list(T1), int(0), T1], front: "set_at" },
  "set_at[Table]": { args: [table(T1, T2), T1, T2], front: "set_at" },

  // Slice
  "slice[codepoint]": { args: [text(), int(0), int(0)], front: true },
  "slice[byte]": { args: [text(), int(0), int(0)], front: true },
  "slice[Ascii]": { args: [ascii, int(0), int(0)], front: "slice" },
  "slice[List]": { args: [list(T1), int(0), int(0)], front: "slice" },

  // Chars
  "ord_at[byte]": { args: [text(), int(0)], front: true },
  "ord_at[codepoint]": { args: [text(), int(0)], front: true },
  "ord_at[Ascii]": { args: [ascii, int(0)], front: "ord_at" },
  "ord[byte]": { args: [text(int(1, 1))], front: true },
  "ord[codepoint]": { args: [text(int(1, 1))], front: true },
  "ord[Ascii]": { args: [text(int(1, 1), true)], front: "ord" },
  "char[byte]": { args: [int(0, 255)], front: true },
  "char[codepoint]": { args: [int(0, 0x10ffff)], front: true },
  "char[Ascii]": { args: [int(0, 127)], front: "char" },

  // Order
  "sorted[Int]": { args: [list(int(0))], front: "sorted" },
  "sorted[Ascii]": { args: [list(ascii)], front: "sorted" },
  "reversed[byte]": { args: [text()], front: true },
  "reversed[codepoint]": { args: [text()], front: true },
  "reversed[Ascii]": { args: [ascii], front: "reversed" },
  "reversed[List]": { args: [list(T1)], front: "reversed" },
  "find[codepoint]": { args: [text()], front: true },
  "find[byte]": { args: [text()], front: true },
  "find[Ascii]": { args: [ascii], front: "find" },
  "find[List]": { args: [list(T1)], front: "find" },

  // Membership
  "contains[Array]": { args: [array(T1, T2), T1], front: "contains" },
  "contains[List]": { args: [list(T1), T1], front: "contains" },
  "contains[Table]": { args: [table(T1, T2), T1], front: "contains" },
  "contains[Set]": { args: [set(T1), T1], front: "contains" },
  "contains[Text]": { args: [text(), text()], front: "contains" },

  // Size
  "size[List]": { args: [list(T1)], front: "size" },
  "size[Set]": { args: [set(T1)], front: "size" },
  "size[Table]": { args: [table(T1, T2)], front: "size" },
  "size[Ascii]": { args: [ascii], front: "size" },
  "size[codepoint]": { args: [text()], front: true },
  "size[byte]": { args: [text()], front: true },

  // Adding items
  include: { args: [set(T1), T1], front: true },
  push: { args: [list(T1), T1], front: true },
  append: { args: [list(T1), T1], front: true },
  "concat[List]": { args: variadic(list(T1)), front: "concat", assoc: true },
  "concat[Text]": { args: variadic(text()), front: "concat", assoc: true },

  // Text ops
  repeat: { args: [text(), int(0)], front: true },
  split: { args: [text(), text()], front: true },
  split_whitespace: { args: [text()], front: true },
  join: { args: [list(text()), text()], front: true },
  right_align: { args: [text(), int(0)], front: true },
  replace: { args: [text(), text(), text()], front: true },
  text_multireplace: { args: variadic(text(), 2) },

  // Text / Bool <-> Int
  int_to_bin_aligned: { args: [int(0), int(0)], front: true },
  int_to_hex_aligned: { args: [int(0), int(0)], front: true },
  int_to_dec: { args: [int()], front: true },
  int_to_bin: { args: [int(0)], front: true },
  int_to_hex: { args: [int(0)], front: true },
  int_to_bool: { args: [int(0, 1)], front: true },
  dec_to_int: { args: [ascii], front: true },
  bool_to_int: { args: [bool], front: true },
} as const satisfies Record<string, OpCodeDefinition>;

type AnyOpCode = keyof typeof opCodeDefinitions;
export type OpCode<T extends Partial<OpCodeDefinition> = {}> = {
  [K in AnyOpCode]: (typeof opCodeDefinitions)[K] extends T ? K : never;
}[AnyOpCode];
export type NullaryOpCode = OpCode<{ args: Readonly<[]> }>;
export type UnaryOpCode = OpCode<{ args: Readonly<[Type]> }>;
export type BinaryOpCode = OpCode<{ args: Readonly<[Type, Type]> }>;
export type TernaryOpCode = OpCode<{ args: Readonly<[Type, Type, Type]> }>;
export type VariadicOpCode = OpCode<{ args: Readonly<Variadic> }>;
export type AssociativeOpCode = OpCode<{ assoc: true }>;

export function isNullary(op: OpCode): op is NullaryOpCode {
  return arity(op) === 0;
}
export function isUnary(op: OpCode): op is UnaryOpCode {
  return arity(op) === 1;
}
export function isBinary(op: OpCode): op is BinaryOpCode {
  return arity(op) === 2;
}
export function isTernary(op: OpCode): op is TernaryOpCode {
  return arity(op) === 3;
}
export function isAssociative(op: OpCode): op is AssociativeOpCode {
  return (opCodeDefinitions[op] as any)?.assoc === true;
}

export const CommutativeOpCodes = [
  "add",
  "mul",
  "bit_and",
  "bit_or",
  "bit_xor",
  "and",
  "or",
  "gcd",
  "min",
  "max",
] as const;

export type CommutativeOpCode = string & (typeof CommutativeOpCodes)[number];

export function isCommutative(op: OpCode): op is CommutativeOpCode {
  return CommutativeOpCodes.includes(op as any);
}

export function isOpCode(op: string): op is OpCode {
  return op in opCodeDefinitions;
}

/**
 * Returns parity of an op, -1 denotes variadic.
 */
export function arity(op: OpCode): number {
  const args = opCodeDefinitions[op].args;
  if ("variadic" in args) return -1;
  return args.length;
}

/**
 * Maps a binary op to another one with the same meaning, except the order of the arguments is swapped.
 * This should only be used for ops that are *not* associative.
 */
export function flipOpCode(op: BinaryOpCode): BinaryOpCode | null {
  switch (op) {
    case "eq[Int]":
    case "neq[Int]":
      return op;
    case "lt":
      return "gt";
    case "gt":
      return "lt";
    case "leq":
      return "geq";
    case "geq":
      return "leq";
  }
  return null;
}

export function booleanNotOpCode(op: BinaryOpCode): BinaryOpCode | null {
  switch (op) {
    case "eq[Int]":
      return "neq[Int]";
    case "neq[Int]":
      return "eq[Int]";
    case "eq[Text]":
      return "neq[Text]";
    case "neq[Text]":
      return "eq[Text]";
    case "lt":
      return "geq";
    case "gt":
      return "leq";
    case "leq":
      return "gt";
    case "geq":
      return "lt";
  }
  return null;
}

export type AliasedOpCode<X, Alias, Otherwise = X> = [Alias] extends [X]
  ? [X] extends [Alias | infer Additional extends OpCode]
    ? Alias | Additional
    : Otherwise
  : Otherwise;
