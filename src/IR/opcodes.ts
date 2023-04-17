export const frontendOpcodes: OpCode[] = [
  "add",
  "sub",
  "mul",
  "div",
  "pow",
  "mod",
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
  "array_contains",
  "list_contains",
  "table_contains_key",
  "set_contains",
  "array_get",
  "list_get",
  "table_get",
  "text_get_byte",
  "list_push",
  "concat",
  "repeat",
  "text_contains",
  "text_byte_find",
  "text_codepoint_find",
  "text_split",
  "text_get_byte",
  "text_get_byte_slice",
  "text_get_codepoint",
  "text_get_codepoint_slice",
  "join_using",
  "right_align",
  "int_to_bin_aligned",
  "int_to_hex_aligned",
  "simplify_fraction",

  "abs",
  "bit_not",
  "neg",
  "not",
  "int_to_text",
  "int_to_bin",
  "int_to_hex",
  "text_to_int",
  "bool_to_int",
  "int_to_text_byte",
  "list_length",
  "text_byte_length",
  "text_codepoint_length",
  "text_split_whitespace",
  "join",
  "text_byte_reversed",
  "text_codepoint_reversed",
  "true",
  "false",
  "print",
  "println",
  "text_replace",
  "array_set",
  "list_set",
  "table_set",
  "sorted",
];

export const BinaryOpCodeArray = [
  // (num, num) => num
  "add",
  "sub",
  "mul",
  "div",
  "trunc_div",
  "pow",
  "mod",
  "rem",
  "bit_and",
  "bit_or",
  "bit_xor",
  "bit_shift_left",
  "bit_shift_right",
  "gcd",
  "min",
  "max",
  // (num, num) => bool
  "lt",
  "leq",
  "eq",
  "neq",
  "geq",
  "gt",
  // (bool, bool) => bool
  "or",
  "and",
  // membership
  "array_contains",
  "list_contains",
  "table_contains_key",
  "set_contains",
  // collection get
  "array_get",
  "list_get",
  "table_get",
  // other
  "list_push",
  "concat",
  "repeat",
  "text_contains",
  "text_codepoint_find", // (text_codepoint_find a b) returns the codepoint-0-index of the start of the first occurence of b in a or -1 if it is not found
  "text_byte_find", // (text_byte_find a b) returns the byte-0-index of the start of the first occurence of b in a or -1 if it is not found
  "text_split",
  "text_get_byte", // returns a single byte text at the specified byte-0-index
  "text_get_codepoint", // returns a single codepoint text at the specified codepoint-0-index
  "text_get_codepoint_to_int", // gets the codepoint at the specified codepoint-0-index as an integer
  "codepoint_to_int", // (codepoint_to_int (text_get_codepoint $x $i)) is equivalent to (text_get_codepoint_to_int $x $i), "codepoint_to_int" is the inverse of "int_to_codepoint"
  "text_get_byte_to_int", // gets the byte at the specified byte-0-index as an integer
  "text_byte_to_int", // (text_byte_to_int (text_get_byte $x $i)) is equivalent to (text_get_byte_to_int $x $i), "text_byte_to_int" is the inverse of "int_to_text_byte"
  "join_using",
  "right_align",
  "int_to_bin_aligned", // Converts the given integer to text representing the value in binary. The result is aligned with 0s to the specified number of places.
  "int_to_hex_aligned", // Converts the given integer to text representing the value in hexadecimal. The result is aligned with 0s to the specified number of places.
  "simplify_fraction", // Given two integers, p,q, returns a text representation of the reduced version of the fraction p/q.
] as const;
export type BinaryOpCode = typeof BinaryOpCodeArray[number];

export const UnaryOpCodeArray = [
  "argv_get",
  "abs",
  "bit_not",
  "neg",
  "not",
  "int_to_text",
  "int_to_bin",
  "int_to_hex",
  "text_to_int",
  "bool_to_int",
  "int_to_text_byte", // Returns a single byte text using the specified byte.
  "int_to_codepoint", // Returns a single codepoint text using the specified integer.
  "list_length",
  "text_codepoint_length", // Returns the text length in codepoints.
  "text_byte_length", // Returns the text length in bytes.
  "text_split_whitespace",
  "sorted",
  "join",
  "text_byte_reversed", // Returns a text containing the reversed order of bytes.
  "text_codepoint_reversed", // Returns a text containing the reversed order of codepoints.
] as const;
export type UnaryOpCode = typeof UnaryOpCodeArray[number];

export const OpCodeArray = [
  ...BinaryOpCodeArray,
  ...UnaryOpCodeArray,
  "true",
  "false",
  "argv",
  "argc",
  "print",
  "println",
  "text_replace",
  "text_get_codepoint_slice", // Returns a slice of the input text. Indeces are codepoint-0-based, start is inclusive, end is exclusive.
  "text_get_byte_slice", // Returns a slice of the input text. Indeces are byte-0-based, start is inclusive, end is exclusive.
  // collection set
  "array_set",
  "list_set",
  "table_set",
] as const;

export type OpCode = typeof OpCodeArray[number];

export function isOpCode(op: string): op is OpCode {
  return OpCodeArray.includes(op as any);
}
export function isUnary(op: OpCode): op is UnaryOpCode {
  return UnaryOpCodeArray.includes(op as any);
}
export function isBinary(op: OpCode): op is BinaryOpCode {
  return BinaryOpCodeArray.includes(op as any);
}
export function arity(op: OpCode): number {
  if (isUnary(op)) return 1;
  if (isBinary(op)) return 2;
  switch (op) {
    case "true":
    case "false":
    case "argv":
    case "argc":
      return 0;
    case "print":
    case "println":
      return 1;
    case "text_replace":
    case "text_get_byte_slice":
    case "text_get_codepoint_slice":
    case "array_set":
    case "list_set":
    case "table_set":
      return 3;
  }
}

/**
 * Maps a binary op to another one with the same meaning, except the order of the arguments is swapped.
 * This should only be used for ops that are *not* associative.
 */
export function flipOpCode(op: BinaryOpCode): BinaryOpCode | null {
  switch (op) {
    case "eq":
    case "neq":
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
    case "eq":
      return "neq";
    case "neq":
      return "eq";
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

export function isAssociative(op: OpCode): boolean {
  return [
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
    "concat",
  ].includes(op);
}

export const isCommutative = (op: OpCode) =>
  [
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
  ].includes(op);
