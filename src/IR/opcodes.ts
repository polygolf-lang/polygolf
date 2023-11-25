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
  args: Readonly<ArgTypes>;
  front?: true | string;
  assoc?: true;
  commutes?: true;
}

interface Variadic {
  variadic: Type;
  min: number;
}
export type ArgTypes = Variadic | readonly Type[];
function variadic(type: Type, min = 2): Variadic {
  return {
    variadic: type,
    min,
  };
}

const T1 = typeArg("T1");
const T2 = typeArg("T2");

export const opCodeDefinitions = {
  // Arithmetic
  add: { args: variadic(int()), front: "+", assoc: true, commutes: true },
  sub: { args: [int(), int()], front: "-" },
  mul: { args: variadic(int()), front: "*", assoc: true, commutes: true },
  div: { args: [int(), int()], front: "div" },
  trunc_div: { args: [int(), int()] },
  unsigned_trunc_div: { args: [int(), int()] },
  pow: { args: [int(), int(0)], front: "^" },
  mod: { args: [int(), int()], front: "mod" },
  rem: { args: [int(), int()] },
  unsigned_rem: { args: [int(), int()] },
  bit_and: { args: variadic(int()), front: "&", assoc: true, commutes: true },
  bit_or: { args: variadic(int()), front: "|", assoc: true, commutes: true },
  bit_xor: { args: variadic(int()), front: "~", assoc: true, commutes: true },
  bit_shift_left: { args: [int(), int(0)], front: "<<" },
  bit_shift_right: { args: [int(), int(0)], front: ">>" },
  gcd: { args: variadic(int()), front: true, assoc: true, commutes: true },
  min: { args: variadic(int()), front: true, assoc: true, commutes: true },
  max: { args: variadic(int()), front: true, assoc: true, commutes: true },
  neg: { args: [int()], front: "-" },
  abs: { args: [int()], front: true },
  bit_not: { args: [int()], front: "~" },

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
  println_many_joined: { args: variadic(text(), 2) },
  "putc[byte]": { args: [int(0, 255)], front: true },
  "putc[codepoint]": { args: [int(0, 0x10ffff)], front: true },
  "putc[Ascii]": { args: [int(0, 127)], front: "putc" },

  // Bool arithmetic
  or: { args: variadic(bool), front: true, assoc: true, commutes: true },
  and: { args: variadic(bool), front: true, assoc: true, commutes: true },
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
  "at[Table]": { args: [table(T1, T2), T1], front: "@" },
  "at[Ascii]": { args: [ascii, int(0)], front: "@" },
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
  push: { args: [list(T1), T1], front: true },
  append: { args: [list(T1), T1], front: ".." },
  "concat[List]": { args: variadic(list(T1)), front: "..", assoc: true },
  "concat[Text]": { args: variadic(text()), front: "..", assoc: true },

  // Text ops
  repeat: { args: [text(), int(0)], front: true },
  split: { args: [text(), text()], front: true },
  split_whitespace: { args: [text()], front: true },
  join: { args: [list(text()), text()], front: true },
  right_align: { args: [text(), int(0)], front: true },
  replace: { args: [text(), text(int(1)), text()], front: true },
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

export const opCodeDescriptions: Record<AnyOpCode, string> = {
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
  "at[Table]": "Gets the item at the key.",
  "at[Ascii]": "Gets the character at the 0-based index.",
  "at[byte]": "Gets the byte (as text) at the 0-based index (counting bytes).",
  "at[codepoint]":
    "Gets the codepoint (as text) at the 0-based index (counting codepoints).",
  "set_at[Array]": "Sets the item at the 0-based index.",
  "set_at[List]": "Sets the item at the 0-based index.",
  "set_at[Table]": "Sets the item at the key.",

  // Slice
  "slice[codepoint]": "TODO",
  "slice[byte]": "TODO",
  "slice[Ascii]": "TODO",
  "slice[List]": "TODO",

  // Chars
  "ord_at[byte]":
    "Gets the byte (as integer) at the 0-based index (counting bytes).",
  "ord_at[codepoint]":
    "Gets the codepoint (as integer) at the 0-based index (counting codepoints).",
  "ord_at[Ascii]": "Gets the character (as integer) at the 0-based index.",
  "ord[byte]": "Converts the byte to an integer.",
  "ord[codepoint]": "Converts the codepoint to an integer.",
  "ord[Ascii]": "Converts the character to an integer.",
  "char[byte]": "Returns a byte (as text) corresponding to the integer.",
  "char[codepoint]":
    "Returns a codepoint (as text) corresponding to the integer.",
  "char[Ascii]": "Returns a character corresponding to the integer.",

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
  push: "Modifies the list by pushing the given item at the end.",
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

  // Text / Bool <-> Int
  int_to_bin_aligned:
    "Converts the integer to a 2-base text and alignes to a minimum length.",
  int_to_hex_aligned:
    "Converts the integer to a 16-base text and alignes to a minimum length.",
  int_to_dec: "Converts the integer to a 10-base text.",
  int_to_bin: "Converts the integer to a 2-base text.",
  int_to_hex: "Converts the integer to a 16-base text.",
  int_to_bool: "Converts 0 to false and 1 to true.",
  dec_to_int: "Parses a integer from a 10-base text.",
  bool_to_int: "Converts false to 0 and true to 1.",
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
export type VariadicOpCode = OpCode<{ args: Variadic }>;
export type AssociativeOpCode = OpCode<{ assoc: true }>;
export type CommutativeOpCode = OpCode<{ commutes: true }>;

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
export function isVariadic(op: OpCode): op is VariadicOpCode {
  return arity(op) === -1;
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
 * Returns parity of an op, -1 denotes variadic.
 */
export function arity(op: OpCode): number {
  try {
    const args = opCodeDefinitions[op].args;
    if ("variadic" in args) return -1;
    return args.length;
  } catch (e) {
    console.log("arity of", op);
    throw e;
  }
}

export function matchesOpCodeArity(op: OpCode, arity: number) {
  const expectedTypes = opCodeDefinitions[op].args;
  if ("variadic" in expectedTypes) {
    return arity >= expectedTypes.min;
  }
  return expectedTypes.length === arity;
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

export const infixableOpCodeNames = [
  "+",
  "-",
  "*",
  "^",
  "&",
  "|",
  "~",
  ">>",
  "<<",
  "==",
  "!=",
  "<=",
  "<",
  ">=",
  ">",
  "#",
  "@",
  "mod",
  "rem",
  "div",
  "trunc_div",
] as const satisfies readonly OpCodeFrontName[];
