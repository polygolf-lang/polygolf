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
  pow: { args: [int(), int()], front: "^" },
  mod: { args: [int(), int()], front: "mod" },
  rem: { args: [int(), int()] },
  unsigned_rem: { args: [int(), int()] },
  bit_and: { args: variadic(int()), front: "&", assoc: true, commutes: true },
  bit_or: { args: variadic(int()), front: "|", assoc: true, commutes: true },
  bit_xor: { args: variadic(int()), front: "~", assoc: true, commutes: true },
  bit_shift_left: { args: [int(), int()], front: "<<" },
  bit_shift_right: { args: [int(), int()], front: ">>" },
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
  "print[Int]": { args: [text()], front: "print" },
  "println[Text]": { args: [int()], front: "println" },
  "println[Int]": { args: [int()], front: "println" },
  println_list_joined: { args: [list(text()), text()] },
  println_many_joined: { args: variadic(text(), 2) },
  "putc[byte]": { args: [int(0, 255)], front: true },
  "putc[codepoint]": { args: [int(0, 0x10ffff)], front: true },
  "putc[Ascii]": { args: [int(0, 127)], front: "putc" },

  // Bool arithmetic
  or: { args: variadic(bool), front: true, assoc: true, commutes: true },
  and: { args: variadic(bool), front: true, assoc: true, commutes: true },
  unsafe_or: { args: variadic(bool), front: true, assoc: true, commutes: true },
  unsafe_and: { args: variadic(bool), front: true, commutes: true },
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

/**
 * Returns parity of an op, -1 denotes variadic.
 */
export function arity(op: OpCode): number {
  const args = opCodeDefinitions[op].args;
  if ("variadic" in args) return -1;
  return args.length;
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
