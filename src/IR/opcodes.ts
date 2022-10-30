export const BinaryOpCodeArray = [
  // (num, num) => num
  "add",
  "sub",
  "mul",
  "div",
  "truncdiv",
  "exp",
  "mod",
  "rem",
  "bitand",
  "bitor",
  "bitxor",
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
  "inarray",
  "inlist",
  "inmap",
  "inset",
  // collection get
  "array_get",
  "list_get",
  "table_get",
  "str_get_byte",
  "argv_get",
  // other
  "list_push",
  "str_concat",
  "repeat",
  "is_substr",
  "str_find",
  "str_split",
  "str_get_char",
  "join_using",
  "right_align",
  "int_to_bin_aligned",
  "int_to_hex_aligned",
  "simplify_fraction",
];
export type BinaryOpCode = typeof BinaryOpCodeArray[number];

export const UnaryOpCodeArray = [
  "abs",
  "bitnot",
  "neg",
  "not",
  "int_to_str",
  "int_to_bin",
  "int_to_hex",
  "str_to_int",
  "bool_to_int",
  "byte_to_char",
  "cardinality",
  "str_length",
  "str_split_whitespace",
  "sorted",
  "join",
  "str_reversed",
];
export type UnaryOpCode = typeof UnaryOpCodeArray[number];

export const OpCodeArray = [
  ...BinaryOpCodeArray,
  ...UnaryOpCodeArray,
  "true",
  "false",
  "argv",
  "print",
  "println",
  "str_replace",
  "str_substr",
  // collection set
  "array_set",
  "list_set",
  "table_set",
];

export type OpCode = typeof OpCodeArray[number];

export function flipOpCode(op: BinaryOpCode): BinaryOpCode | null {
  switch (op) {
    case "add":
    case "mul":
    case "eq":
    case "neq":
    case "bitand":
    case "bitor":
    case "bitxor":
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

export function getDefaultPrecedence(op: BinaryOpCode | UnaryOpCode): number {
  switch (op) {
    case "exp":
      return 130;
    case "neg":
      return 120;
    case "repeat":
    case "mul":
    case "div":
    case "mod":
      return 110;
    case "add":
    case "sub":
      return 100;
    case "bitand":
      return 80;
    case "bitxor":
      return 70;
    case "bitor":
      return 60;
    case "str_concat":
      return 50;
    case "lt":
    case "gt":
    case "leq":
    case "geq":
    case "eq":
    case "neq":
    case "inarray":
    case "inset":
    case "inlist":
    case "inmap":
      return 40;
    case "not":
      return 30;
    case "and":
      return 20;
    case "or":
      return 10;
    default:
      return 0;
  }
}
