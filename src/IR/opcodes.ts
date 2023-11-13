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
type ArgTypes = Variadic | Type[];
function variadic(type: Type, min = 2): ArgTypes {
  return {
    variadic: type,
    min,
  };
}

const T1 = typeArg("T1");
const T2 = typeArg("T2");

const OpCodeDefinitions = {
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
} as const satisfies Record<string, OpCodeDefinition>;

type AnyOpCode = keyof typeof OpCodeDefinitions;
export type OpCode<T extends Partial<OpCodeDefinition> = {}> = {
  [K in AnyOpCode]: (typeof OpCodeDefinitions)[K] extends T ? K : never;
}[AnyOpCode];
export type NullaryOpCode = OpCode<{ args: Readonly<[]> }>;
export type UnaryOpCode = OpCode<{ args: Readonly<[Type]> }>;
export type BinaryOpCode = OpCode<{ args: Readonly<[Type, Type]> }>;
export type TernaryOpCode = OpCode<{ args: Readonly<[Type, Type, Type]> }>;
export type VariadicOpCode = OpCode<{ args: Readonly<Variadic> }>;

export const FrontendOpCodes = [
  "add",
  "sub",
  "mul",
  "div",
  "mod",
  "pow",
  "bit_and",
  "bit_or",
  "bit_xor",
  "min",
  "max",
  "lt",
  "leq",
  "eq",
  "neq",
  "gt",
  "geq",

  "or",
  "and",

  "contains",
  "at",
  "at[byte]",
  "at[codepoint]",
  "push",
  "concat",
  "repeat",
  "find",
  "find[byte]",
  "find[codepoint]",
  "split",
  "slice",
  "slice[byte]",
  "slice[codepoint]",
  "join",
  "right_align",
  "to_bin_aligned",
  "to_hex_aligned",

  "abs",
  "bit_not",
  "neg",
  "not",
  "to_dec",
  "to_bin",
  "to_hex",
  "dec_to_int",
  "bool_to_int",
  "char",
  "char[byte]", // Returns a single byte text using the specified byte.
  "char[codepoint]", // Returns a single codepoint text using the specified integer.
  "length",
  "length[byte]", // Returns the text length in bytes.
  "length[codepoint]", // Returns the text length in codepoints.
  "split_whitespace",
  "reversed[byte]", // Returns a text containing the reversed order of bytes.
  "reversed[codepoint]", // Returns a text containing the reversed order of codepoints.
  "reversed",
  "ord[byte]",
  "ord[codepoint]",
  "ord[Ascii]",
  "read[line]",
  "true",
  "false",
  "replace",
  "set_at[Array]",
  "set_at[List]",
  "set_at[Table]",
  "sorted",
  "at[argv]",
] as const;

export const UnaryOpCodes = [
  "to_dec",
  "to_bin",
  "to_hex",
  "to_bool",
  "dec_to_int",
  "bool_to_int",
  "length[List]",
  "length[codepoint]",
  "length[byte]",
  "split_whitespace",
  "sorted",
  "reversed[byte]",
  "reversed[codepoint]",
] as const;
export type UnaryOpCodeOld = string & (typeof UnaryOpCodes)[number];

export function isUnary(op: OpCode): op is UnaryOpCode {
  return UnaryOpCodes.includes(op as any);
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

export const AssociativeOpCodes = [
  ...CommutativeOpCodes,
  "concat[Text]",
] as const;

export type AssociativeOpCode = string & (typeof AssociativeOpCodes)[number];

export function isAssociative(op: OpCode): op is AssociativeOpCode {
  return AssociativeOpCodes.includes(op as any);
}

export const BinaryOpCodes = [
  ,
  // (num, num) => num

  // (num, num) => bool

  // (bool, bool) => bool
  // membership
  "contains[Array]",
  "contains[List]",
  "contains[Table]",
  "contains[Set]",
  ,
  // collection get

  // other
  "push",
  "append",
  "list_find", // returns the 0-index of the first occurence of or -1 if it is not found
  "concat[Text]",
  "concat[List]",
  "repeat",
  "contains[Text]",
  "find[codepoint]", // (text_codepoint_find a b) returns the codepoint-0-index of the start of the first occurence of b in a or -1 if it is not found
  "find[byte]", // (text_byte_find a b) returns the byte-0-index of the start of the first occurence of b in a or -1 if it is not found
  "split",
  "join",
  "right_align",
  "to_bin_aligned", // Converts the given integer to text representing the value in binary. The result is aligned with 0s to the specified number of places.
  "to_hex_aligned", // Converts the given integer to text representing the value in hexadecimal. The result is aligned with 0s to the specified number of places.
  "simplify_fraction", // Given two integers, p,q, returns a text representation of the reduced version of the fraction p/q.
] as const;

export type BinaryOpCodeOld = string & (typeof BinaryOpCodes)[number];

export function isBinary(op: OpCode): op is BinaryOpCode {
  return BinaryOpCodes.includes(op as any);
}

export const OpCodes = [
  ...BinaryOpCodes,
  ...UnaryOpCodes,

  "replace",
  "text_multireplace", // simultaneous replacement. Equivalent to chained text_replace if the inputs and outputs have no overlap

  // collection set
] as const;

export type OpCodeOld = string & (typeof OpCodes)[number];

export function isOpCode(op: string): op is OpCode {
  return OpCodes.includes(op as any);
}

/**
 * Returns parite of an op, -1 denotes variadic.
 */
export function arity(op: OpCode): number {
  if (isUnary(op)) return 1;
  if (isBinary(op)) return 2;
  switch (op) {
    case "true":
    case "false":
    case "argv":
    case "argc":
    case "read[byte]":
    case "read[codepoint]":
    case "read[Int]":
    case "read[line]":
      return 0;
    case "replace":
    case "slice[byte]":
    case "slice[codepoint]":
    case "set_at[Array]":
    case "set_at[List]":
    case "set_at[Table]":
      return 3;
    case "println_many_joined":
    case "text_multireplace":
      return -1;
  }
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
