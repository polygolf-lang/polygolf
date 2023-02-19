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
  "text_get_byte",
  // other
  "list_push",
  "text_concat",
  "repeat",
  "text_contains",
  "text_find",
  "text_split",
  "text_get_char",
  "join_using",
  "right_align",
  "int_to_bin_aligned",
  "int_to_hex_aligned",
  "simplify_fraction",
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
  "byte_to_char",
  "list_length",
  "text_length",
  "text_split_whitespace",
  "sorted",
  "join",
  "text_reversed",
] as const;
export type UnaryOpCode = typeof UnaryOpCodeArray[number];

export const OpCodeArray = [
  ...BinaryOpCodeArray,
  ...UnaryOpCodeArray,
  "true",
  "false",
  "argv",
  "print",
  "println",
  "text_replace",
  "text_get_slice",
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
      return 0;
    case "print":
    case "println":
      return 1;
    case "text_replace":
    case "text_get_slice":
    case "array_set":
    case "list_set":
    case "table_set":
      return 3;
  }
}

export function flipOpCode(op: BinaryOpCode): BinaryOpCode | null {
  switch (op) {
    case "add":
    case "mul":
    case "eq":
    case "neq":
    case "bit_and":
    case "bit_or":
    case "bit_xor":
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
