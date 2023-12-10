import { Node, isInt, isOp, isText } from "./IR";
import { OpCode } from "./opcodes";

export function evalOp(opCode: OpCode, args: Node[]): Node | null {
  function text(i: number): string {
    const arg = args[i];
    if (isText()(arg)) return arg.value;
    throw new Error("Not a text literal node.");
  }
  function int(i: number): bigint {
    const arg = args[i];
    if (isInt()(arg)) return arg.value;
    throw new Error("Not an int literal node.");
  }
  function bool(i: number): boolean {
    const arg = args[i];
    if (isOp("true", "false")(arg)) return arg.op === "true";
    throw new Error("Not a boolean literal node.");
  }
  function list(i: number): Node[] {
    const arg = args[i];
    if (arg.kind === "List") return [...arg.exprs];
    throw new Error("Not a list literal node.");
  }
  function array(i: number): Node[] {
    const arg = args[i];
    if (arg.kind === "Array") return [...arg.exprs];
    throw new Error("Not an array literal node.");
  }
  const evaluators: Record<OpCode, () => string | boolean | bigint | Node> = {
    // Arithmetic
    add: () => int(0) + int(1),
    sub: () => int(0) - int(1),
    mul: () => int(0) * int(1),
    div: () => "TODO",
    trunc_div: () => "TODO",
    unsigned_trunc_div: () => "TODO",
    pow: () => int(0) ** int(1),
    mod: () => "TODO",
    rem: () => "TODO",
    unsigned_rem: () => "TODO",
    bit_and: () => int(0) & int(1),
    bit_or: () => int(0) | int(1),
    bit_xor: () => int(0) ^ int(1),
    bit_shift_left: () => int(0) << int(1),
    bit_shift_right: () => int(0) >> int(1),
    gcd: () => "TODO",
    min: () => "TODO",
    max: () => "TODO",
    neg: () => -int(0),
    abs: () => "TODO",
    bit_not: () => "TODO",

    // Input
    "read[codepoint]": () => "TODO",
    "read[byte]": () => "TODO",
    "read[Int]": () => "TODO",
    "read[line]": () => "TODO",
    "at[argv]": () => "TODO",
    argv: () => "TODO",
    argc: () => "TODO",

    // Output
    "print[Text]": () => "TODO",
    "print[Int]": () => "TODO",
    "println[Text]": () => "TODO",
    "println[Int]": () => "TODO",
    println_list_joined: () => "TODO",
    println_many_joined: () => "TODO",
    "putc[byte]": () => "TODO",
    "putc[codepoint]": () => "TODO",
    "putc[Ascii]": () => "TODO",

    // Bool arithmetic
    or: () => bool(0) || bool(1),
    and: () => bool(0) && bool(1),
    unsafe_or: () => bool(0) || bool(1),
    unsafe_and: () => bool(0) && bool(1),
    not: () => !bool(0),
    true: () => true,
    false: () => false,

    // Comparison
    lt: () => int(0) < int(1),
    leq: () => int(0) <= int(1),
    geq: () => int(0) >= int(1),
    gt: () => int(0) > int(1),
    "eq[Int]": () => int(0) === int(1),
    "eq[Text]": () => text(0) === text(1),
    "neq[Int]": () => int(0) !== int(1),
    "neq[Text]": () => text(0) !== text(1),

    // Access members
    "at[Array]": () => array(0)[Number(int(1))],
    "at[List]": () => list(0)[Number(int(1))],
    "at_back[List]": () => list(0).at(Number(int(1)))!,
    "at[Table]": { args: [table(T1, T2), T1], front: "@" },
    "at[Ascii]": { args: [ascii, int(0)], front: "@" },
    "at_back[Ascii]": { args: [ascii, int("-oo", -1)], front: "@" },
    "at[byte]": { args: [text(), int(0)], front: true },
    "at_back[byte]": { args: [text(), int("-oo", -1)], front: true },
    "at[codepoint]": { args: [text(), int(0)], front: true },
    "at_back[codepoint]": { args: [text(), int("-oo", -1)], front: true },
    "set_at[Array]": { args: [array(T1, T2), T2, T1], front: "set_at" },
    "set_at[List]": { args: [list(T1), int(0), T1], front: "set_at" },
    "set_at_back[List]": {
      args: [list(T1), int("-oo", -1), T1],
      front: "set_at",
    },
    "set_at[Table]": { args: [table(T1, T2), T1, T2], front: "set_at" },

    // Slice
    "slice[codepoint]": { args: [text(), int(0), int(0)], front: true },
    "slice[byte]": { args: [text(), int(0), int(0)], front: true },
    "slice[Ascii]": { args: [ascii, int(0), int(0)], front: "slice" },
    "slice[List]": { args: [list(T1), int(0), int(0)], front: "slice" },

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
  };
}
