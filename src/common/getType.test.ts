import {
  assignment,
  block,
  id,
  type Identifier,
  integerType as int,
  textType as text,
  booleanType as bool,
  listType as list,
  arrayType as array,
  setType as set,
  tableType as table,
  type OpCode,
  op,
  type Type,
  list as listNode,
  variants,
  toString,
  voidType,
  indexCall,
  text as textNode,
  int as intNode,
  array as arrayNode,
  set as setNode,
  keyValue,
  table as tableNode,
  listType,
  functionCall,
  type IntegerType,
  isAssociative,
  forRangeCommon,
  forDifferenceRange,
  type Node,
} from "IR";
import { PolygolfError } from "./errors";
import { calcType } from "./getType";

const ascii = (x: number | IntegerType = int(0)) => text(x, true);

/** returns identifier expression of given type */
function e(type: Type): Identifier {
  return { ...id(""), type };
}

function testNode(
  name: string,
  expr: Node,
  result: Type | "error",
  prog: Node = block([]),
) {
  test(name, () => {
    if (result === "error") expect(() => calcType(expr, prog)).toThrow();
    else expect(toString(calcType(expr, prog))).toEqual(toString(result));
  });
}

function testOp(
  name: string,
  op: OpCode,
  args: Type[],
  result: Type | "error",
) {
  testNode(name, { kind: "Op", op, args: args.map(e) }, result);
}

function describeOp(op: OpCode, tests: [Type[], Type | "error"][]) {
  describe("OpCode " + op, () => {
    for (const [args, result] of tests) {
      testOp(
        "(" +
          args.map(toString).join(", ") +
          ") -> " +
          (result === "error" ? "error" : toString(result)),
        op,
        args,
        result,
      );
    }
  });
}

function describeArithmeticOp(op: OpCode, tests: [Type[], Type | "error"][]) {
  describeOp(op, [
    [[text(), text()], "error"],
    [[int(), bool], "error"],
    [[int(), text()], "error"],
    isAssociative(op)
      ? [[text(), int()], "error"]
      : [[int(), int(), int()], "error"],
    ...tests,
  ]);
}

describe("Bindings", () => {
  const empty = block([]);
  testNode(
    "for range positive step exclusive",
    id("i"),
    int(0, 9),
    forRangeCommon(["i", 0, 10], empty),
  );
  testNode(
    "for range positive step inclusive",
    id("i"),
    int(0, 10),
    forRangeCommon(["i", 0, 10, 1, true], empty),
  );
  testNode(
    "for range negative step exclusive",
    id("i"),
    int(1, 10),
    forRangeCommon(["i", 10, 0, -1], empty),
  );
  testNode(
    "for range negative step inclusive",
    id("i"),
    int(0, 10),
    forRangeCommon(["i", 10, 0, -1, true], empty),
  );
  testNode(
    "for range general",
    id("i"),
    int(-12, 12),

    forRangeCommon(
      ["i", e(int(-10, 10)), e(int(-12, 12)), e(int(-1, 1)), true],
      empty,
    ),
  );
  testNode(
    "for difference range",
    id("i"),
    int(10, 14),
    forDifferenceRange("i", intNode(10), intNode(5), intNode(1), empty),
  );
});

describe("Block", () => {
  testNode("block", block([]), voidType);
});

describe("Variants", () => {
  testNode("variants", variants([e(int()), e(bool)]), "error");
  testNode("variants", variants([e(int(10, 30)), e(int(20, 40))]), int(10, 40));
});

describe("Assignment", () => {
  testNode("assign bool to int", assignment(e(int()), e(bool)), "error");
  testNode(
    "assign empty list",
    assignment(e(list(text())), listNode([])),
    list("void"),
  );
  test("Self-referential assignment", () => {
    const aLHS = id("a");
    const expr = assignment(aLHS, op("add", id("a"), e(int(1))));
    expect(() => calcType(aLHS, block([expr]))).toThrow(PolygolfError);
  });
});

describe("Functions", () => {
  testNode(
    "Function call wrong types",
    functionCall(id("f", false), [intNode(1n)]),
    "error",
    block([]),
  );
});

describe("Index call", () => {
  testNode("Index int", indexCall(e(int()), e(int())), "error");
  testNode("Index array", indexCall(e(array(int(), 10)), e(int())), "error");
  testNode(
    "Index array",
    indexCall(e(array(int(), 10)), e(int(10, 10))),
    "error",
  );
  testNode(
    "Index array",
    indexCall(e(array(int(), 10)), e(int(0, 0)), true),
    "error",
  );
  testNode(
    "Index array",
    indexCall(e(array(text(), 10)), e(int(0, 9))),
    text(),
  );
  testNode(
    "Index list",
    indexCall(e(list(int())), e(int(0, 0)), true),
    "error",
  );
  testNode("Index list", indexCall(e(list(int())), e(int())), "error");
  testNode("Index list", indexCall(e(list(text())), e(int(0))), text());
});

describe("Literals", () => {
  testNode("int", intNode(4n), int(4, 4));
  testNode("text", textNode("ahoj"), ascii(int(4, 4)));
  testNode("text", textNode("dobrý den"), text(int(9, 9)));
  testNode("bool", op("true"), bool);
  testNode("bool", op("false"), bool);
  testNode("array", arrayNode([e(int()), e(text())]), "error");
  testNode(
    "array",
    arrayNode([e(int(10, 30)), e(int(20, 40))]),
    array(int(10, 40), 2),
  );
  testNode("list", listNode([e(int()), e(text())]), "error");
  testNode(
    "list",
    listNode([e(int(10, 30)), e(int(20, 40))]),
    list(int(10, 40)),
  );
  testNode("set", setNode([e(int()), e(text())]), "error");
  testNode("set", setNode([e(int(10, 30)), e(int(20, 40))]), set(int(10, 40)));
  testNode(
    "table",
    tableNode([keyValue(e(text()), e(int())), keyValue(e(text()), e(text()))]),
    "error",
  );
  testNode("table", tableNode([e(text()) as any, e(int())]), "error");
  testNode(
    "table",
    tableNode([
      keyValue(e(text(10)), e(int(100, 200))),
      keyValue(e(text(20)), e(int(-100, -50))),
    ]),
    table(text(20), int(-100, 200)),
  );
});

// TODO add conditional op once functions are merged

describeArithmeticOp("gcd", [
  [[int()], "error"],
  [[int(), int(1)], int(1)],
  [[int(), int(1, 10)], int(1, 10)],
  [[int(-100, 10), int(30, 200)], int(1, 100)],
]);

describeArithmeticOp("min", [
  [[int()], "error"],
  [[int(), int()], int()],
  [[int(), int(-10, 10)], int("-oo", 10)],
  [[int(), int(-10)], int()],
]);

describeArithmeticOp("max", [
  [[int()], "error"],
  [[int(), int()], int()],
  [[int(), int(-10, 10)], int(-10)],
  [[int(), int("-oo", 10)], int()],
]);

describeArithmeticOp("add", [
  [[int()], "error"],
  [[int(), int()], int()],
  [[int(), int(-10, 10)], int()],
  [[int(1, 2), int(10, 20), int(100, 200), int(1000, 2000)], int(1111, 2222)],
  [[int(30, 200), int(-100, 10)], int(-70, 210)],
  [[int(30, 30), int(-100, -100)], int(-70, -70)],
]);

describeArithmeticOp("sub", [
  [[int()], "error"],
  [[int(), int()], int()],
  [[int(), int(-10, 10)], int()],
  [[int(30, 200), int(-100, 10)], int(20, 300)],
  [[int(30, 30), int(-100, -100)], int(130, 130)],
]);

describeArithmeticOp("mul", [
  [[int()], "error"],
  [[int(), int()], int()],
  [[int(), int(-10, 10)], int()],
  [[int(0), int(-10, 10)], int()],
  [[int(0), int(0, 10)], int(0)],
  [[int(0), int(-1, 1)], int()],
  [[int(3, 20), int(-10, 1)], int(-200, 20)],
  [[int(-3, 20), int(-10, 1)], int(-200, 30)],
  [[int(3, 3), int(-10, -10)], int(-30, -30)],
]);

describeArithmeticOp("div", [
  [[int()], "error"],
  [[int(), int()], int()],
  [[int(), int(-10, 10)], int()],
  [[int(-10, 10), int()], int(-10, 10)],
  [[int(-10, 10), int(5, 10)], int(-2, 2)],
  [[int(0), int(-10, 10)], int()],
  [[int(0), int(0, 10)], int(0)],
  [[int(0), int(-1, 1)], int()],
  [[int(30, 200), int(-10, 1)], int(-200, 200)],
  [[int(30, 200), int(-10, -5)], int(-40, -3)],
  [[int(31, 31), int(-10, -10)], int(-4, -4)],
  [[int(-31, -31), int(10, 10)], int(-4, -4)],
]);

describeArithmeticOp("mod", [
  [[int()], "error"],
  [[int(), int()], int()],
  [[int(), int(-10, 10)], int(-9, 9)],
  [[int(-2, 2), int(10, 10)], int(0, 9)],
  [[int(17, 17), int(10, 10)], int(7, 7)],
]);

describeArithmeticOp("trunc_div", [
  [[int()], "error"],
  [[int(), int()], int()],
  [[int(), int(-10, 10)], int()],
  [[int(-10, 10), int()], int(-10, 10)],
  [[int(-10, 10), int(5, 10)], int(-2, 2)],
  [[int(0), int(-10, 10)], int()],
  [[int(0), int(0, 10)], int(0)],
  [[int(0), int(-1, 1)], int()],
  [[int(30, 200), int(-10, 1)], int(-200, 200)],
  [[int(30, 200), int(-10, -5)], int(-40, -3)],
  [[int(31, 31), int(-10, -10)], int(-3, -3)],
  [[int(-31, -31), int(10, 10)], int(-3, -3)],
]);

describeArithmeticOp("pow", [
  [[int()], "error"],
  [[int(), int()], "error"],
  [[int(), int(0)], int()],
  [[int(0), int(0)], int(0)],
  [[int(), int(2, 2)], int(0)],
  [[int(0, 0), int(0)], int(0, 0)],
  [[int(1, 1), int(0)], int(1, 1)],
  [[int(0, 0), int(0)], int(0, 0)],
  [[int(-1, 1), int(0)], int(-1, 1)],
  [[int("-oo", 0), int(3, 3)], int("-oo", 0)],
  [[int("-oo", 3), int(3, 3)], int("-oo", 27)],
  [[int(-3, -3), int(1, 4)], int(-27, 81)],
  [[int(-3), int(1, 4)], int(-27)],
]);

describeArithmeticOp("bit_shift_left", [
  [[int()], "error"],
  [[int(), int()], "error"],
  [[int(1, 5), int(2, 3)], int(4, 40)],
  [[int("-oo", 0), int(0, "oo")], int("-oo", 0)],
  [[int(-10, -2), int(0, 10)], int(-10240, -2)],
]);

describeArithmeticOp("bit_shift_right", [
  [[int()], "error"],
  [[int(), int()], "error"],
  [[int(1, 5), int(2, 3)], int(0, 1)],
  [[int("-oo", 0), int(0, "oo")], int("-oo", 0)],
  [[int(10, 50), int(2, 3)], int(1, 12)],
]);

describeOp("print", [
  [[int()], "error"],
  [[bool], "error"],
  [[text(), text()], "error"],
  [[text()], voidType],
]);

describeOp("println", [
  [[int()], "error"],
  [[bool], "error"],
  [[text(), text()], "error"],
  [[text()], voidType],
]);

describeOp("print_int", [
  [[text()], "error"],
  [[bool], "error"],
  [[int(), int()], "error"],
  [[int()], voidType],
]);

describeOp("println_int", [
  [[text()], "error"],
  [[bool], "error"],
  [[int(), int()], "error"],
  [[int()], voidType],
]);

describeOp("or", [
  [[bool, int()], "error"],
  [[bool], "error"],
  [[bool, bool], bool],
]);

describeOp("and", [
  [[bool, int()], "error"],
  [[bool], "error"],
  [[bool, bool], bool],
]);

describeOp("array_contains", [
  [[int(), array(int(), 10)], "error"],
  [[list(int()), int()], "error"],
  [[array(int(), 10), text()], "error"],
  [[array(int(), 10), int()], bool],
]);

describeOp("list_contains", [
  [[int(), list(int())], "error"],
  [[array(int(), 10), int()], "error"],
  [[list(int()), text()], "error"],
  [[list(int()), int()], bool],
]);

describeOp("table_contains_key", [
  [[text(), table(text(), int())], "error"],
  [[table(text(), int()), int()], "error"],
  [[table(text(), int()), text()], bool],
]);

describeOp("set_contains", [
  [[int(), set(int())], "error"],
  [[set(int()), text()], "error"],
  [[set(int()), int()], bool],
]);

describeOp("array_get", [
  [[int(0, 3), array(int(), 4)], "error"],
  [[array(int(), 4), text()], "error"],
  [[array(int(), 4), int()], "error"],
  [[array(int(), 4), int(1, 4)], "error"],
  [[array(int(-300, 300), 4), int(0, 3)], int(-300, 300)],
]);

describeOp("list_get", [
  [[int(0), list(int())], "error"],
  [[list(int()), text()], "error"],
  [[list(int()), int()], "error"],
  [[list(int(-300, 300)), int(0)], int(-300, 300)],
]);

describeOp("table_get", [
  [[text(), table(text(), int())], "error"],
  [[table(text(), int()), int()], "error"],
  [[table(text(5), int()), text()], "error"],
  [[table(text(), int()), text()], int()],
]);

describeOp("argv_get", [
  [[int()], "error"],
  [[int(0)], text()],
]);

describeOp("list_push", [
  [[int(), list(int())], "error"],
  [[list(int(0, 1000)), int()], "error"],
  [[list(int(0, 1000)), int(100, 200)], int(0, 1000)],
]);

describeOp("concat", [
  [[text(), int()], "error"],
  [[text(), text()], text()],
  [[ascii(), text(100, true)], ascii()],
  [[text(20), text(30, true)], text(50)],
  [
    [ascii(int(10, 20)), ascii(int(1, 5)), text(int(100, 100))],
    text(int(111, 125)),
  ],
]);

describeOp("repeat", [
  [[text(), text()], "error"],
  [[int(), text()], "error"],
  [[text(), int()], "error"],
  [[text(), int(0)], text()],
  [[ascii(), int(0)], ascii()],
  [[text(int(10, 20), true), int(3, 5)], text(int(30, 100), true)],
]);

describeOp("text_contains", [
  [[text(), int()], "error"],
  [[text(), text()], bool],
]);

describeOp("text_codepoint_find", [
  [[text(), int()], "error"],
  [[text(), text()], "error"],
  [[text(), text(int(1, 1))], int(-1)],
  [[text(100), text(int(10))], int(-1, 90)],
]);

describeOp("text_byte_find", [
  [[text(), int()], "error"],
  [[text(), text()], "error"],
  [[text(), text(int(1, 1))], int(-1)],
  [[text(100), text(int(10))], int(-1, 390)],
  [[ascii(100), text(int(10))], int(-1, 90)],
]);

describeOp("text_split", [
  [[text(), int()], "error"],
  [[text(), text()], listType(text())],
  [[text(500), text()], listType(text(500))],
]);

describeOp("text_get_byte", [
  [[text(), text()], "error"],
  [[text(), int()], "error"],
  [[text(), int(0)], text(int(1, 1))],
  [[ascii(), int(0)], ascii(int(1, 1))],
]);

describeOp("text_get_codepoint", [
  [[text(), text()], "error"],
  [[text(), int()], "error"],
  [[text(), int(0)], text(int(1, 1))],
  [[ascii(), int(0)], ascii(int(1, 1))],
]);

describeOp("text_get_codepoint_to_int", [
  [[text(), text()], "error"],
  [[text(), int()], "error"],
  [[text(), int(0)], int(0, 0x10ffff)],
  [[ascii(), int(0)], int(0, 127)],
]);

describeOp("codepoint_to_int", [
  [[text(), text()], "error"],
  [[text()], "error"],
  [[text(int(1, 1))], int(0, 0x10ffff)],
]);

describeOp("text_get_byte_to_int", [
  [[text(), text()], "error"],
  [[text(), int()], "error"],
  [[text(), int(0)], int(0, 255)],
  [[ascii(), int(0)], int(0, 127)],
]);

describeOp("text_byte_to_int", [
  [[text(), text()], "error"],
  [[text()], "error"],
  [[ascii(int(1, 1))], int(0, 127)],
]);

describeOp("join", [
  [[text(), text()], "error"],
  [[text(), list(text())], "error"],
  [[list(text()), int()], "error"],
  [[list(text()), text()], text()],
  [[list(text()), ascii()], text()],
  [[list(ascii()), text()], text()],
  [[list(ascii()), ascii()], ascii()],
]);

describeOp("right_align", [
  [[text(), text()], "error"],
  [[text(), int()], "error"],
  [[text(), int(0)], text()],
  [[ascii(), int(0)], ascii()],
]);

// TODO int_to_bin_aligned, int_to_hex_aligned, simplify_fraction

describeArithmeticOp("abs", [
  [[int(), int()], "error"],
  [[int()], int(0)],
  [[int("-oo", 10)], int(0)],
  [[int("-oo", -10)], int(10)],
  [[int(-100, -10)], int(10, 100)],
  [[int(-200, 100)], int(0, 200)],
]);

describeArithmeticOp("bit_not", [
  [[int(), int()], "error"],
  [[int()], int()],
  [[int("-oo", 10)], int(-11)],
  [[int(-20, "oo")], int("-oo", 19)],
]);

describeArithmeticOp("neg", [
  [[int(), int()], "error"],
  [[int()], int()],
  [[int("-oo", 10)], int(-10)],
  [[int(-20, "oo")], int("-oo", 20)],
]);

describeOp("not", [
  [[bool, bool], "error"],
  [[int()], "error"],
  [[int(0, 1)], "error"],
  [[bool], bool],
]);

describeOp("int_to_text", [
  [[bool], "error"],
  [[text()], "error"],
  [[int()], ascii(int(1))],
  [[int(-300, 5)], ascii(int(1, 4))],
  [[int(-5, 500)], ascii(int(1, 3))],
  [[int(-5, 5)], ascii(int(1, 2))],
]);

describeOp("int_to_bin", [
  [[bool], "error"],
  [[text()], "error"],
  [[int()], "error"],
  [[int(0)], ascii(int(1))],
  [[int(0, 0b1111)], ascii(int(1, 4))],
  [[int(0, 0b10000)], ascii(int(1, 5))],
]);

describeOp("int_to_hex", [
  [[bool], "error"],
  [[text()], "error"],
  [[int()], "error"],
  [[int(0)], ascii(int(1))],
  [[int(0, 0xffff)], ascii(int(1, 4))],
  [[int(0, 0x10000)], ascii(int(1, 5))],
]);

describeOp("text_to_int", [
  [[bool], "error"],
  [[int()], "error"],
  [[text()], "error"],
  [[ascii(1)], int(0, 9)],
  [[ascii(3)], int(-99, 999)],
  [[ascii(5)], int(-9999, 99999)],
]);

describeOp("bool_to_int", [
  [[int()], "error"],
  [[bool], int(0, 1)],
]);

describeOp("int_to_text_byte", [
  [[text()], "error"],
  [[int(0)], "error"],
  [[int(0, 255)], text(int(1, 1))],
  [[int(0, 127)], ascii(int(1, 1))],
]);

describeOp("int_to_codepoint", [
  [[text()], "error"],
  [[int(0)], "error"],
  [[int(0, 0x10ffff)], text(int(1, 1))],
  [[int(0, 127)], ascii(int(1, 1))],
]);

describeOp("list_length", [
  [[list(int()), int()], "error"],
  [[array(int(), 10)], "error"],
  [[list(int())], int(0)],
]);

describeOp("text_codepoint_length", [
  [[list(int())], "error"],
  [[text(int(20, 58))], int(20, 58)],
  [[ascii(int(20, 58))], int(20, 58)],
]);

describeOp("text_byte_length", [
  [[list(int())], "error"],
  [[text(int(20, 58))], int(20, 4 * 58)],
  [[ascii(int(20, 58))], int(20, 58)],
]);

describeOp("text_split_whitespace", [
  [[list(text())], "error"],
  [[text(58)], list(text(58))],
]);

describeOp("sorted", [
  [[array(text(), 5)], "error"],
  [[set(text())], "error"],
  [[table(text(), text())], "error"],
  [[text()], "error"],
  [[list(int())], list(int())],
  [[list(text())], list(text())],
]);

describeOp("text_byte_reversed", [
  [[list(text())], "error"],
  [[text()], text()],
]);

describeOp("text_codepoint_reversed", [
  [[list(text())], "error"],
  [[text()], text()],
]);

describeOp("argv", [
  [[int(0)], "error"],
  [[], list(text())],
]);

describeOp("argc", [
  [[int(0)], "error"],
  [[], int(0, 2 ** 31 - 1)],
]);

describeOp("text_replace", [
  [[text(), text()], "error"],
  [[text(), text(), text()], "error"],
  [[text(), text(int(1)), text()], text()],
  [[text(58), text(int(1)), text()], text()],
  [[text(), text(int(1)), text(58)], text()],
  [[text(58), text(int(1)), text(58)], text(58 * 58)],
]);

describeOp("text_get_codepoint_slice", [
  [[text(), int(0)], "error"],
  [[text(), int(), int()], "error"],
  [[text(), int(0), int(0)], text()],
  [[text(58), int(0), int(0)], text(58)],
  [[text(), int(0), int(0, 58)], text(58)],
  [[text(), int(30, 200), int(0, 58)], text(28)],
]);

describeOp("text_get_byte_slice", [
  [[text(), int(0)], "error"],
  [[text(), int(), int()], "error"],
  [[text(), int(0), int(0)], text()],
  [[text(58), int(0), int(0)], text(58)],
  [[text(), int(0), int(0, 58)], text(58)],
  [[text(), int(30, 200), int(0, 58)], text(28)],
]);

describeOp("array_set", [
  [[array(int(), 4), text(), int()], "error"],
  [[array(int(), 4), int(), int()], "error"],
  [[array(int(), 4), int(1, 4), int()], "error"],
  [[array(int(-300, 300), 4), int(0, 3), text()], "error"],
  [[array(int(-300, 300), 4), int(0, 3), int(10, 20)], int(-300, 300)],
]);

describeOp("list_set", [
  [[list(int()), text(), int()], "error"],
  [[list(int()), int(), int()], "error"],
  [[list(int(-300, 300)), int(0), text()], "error"],
  [[list(int(-300, 300)), int(0), int(10, 20)], int(-300, 300)],
]);

describeOp("table_set", [
  [[table(text(), int()), int(), text()], "error"],
  [[table(text(5), int()), text(), int()], "error"],
  [[table(text(5), int(0)), text(5), int()], "error"],
  [[table(text(5), int(0)), text(), int(0)], "error"],
  [[table(text(5), int(0)), text(4), int(100)], int(0)],
]);
