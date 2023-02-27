import {
  assignment,
  block,
  Expr,
  id,
  Identifier,
  integerType as int,
  textType as text,
  booleanType as bool,
  listType as list,
  arrayType as array,
  setType as set,
  tableType as table,
  OpCode,
  polygolfOp,
  program,
  Type,
  listConstructor,
  variants,
  toString,
  voidType,
  indexCall,
  stringLiteral,
  int as integerLiteral,
  arrayConstructor,
  setConstructor,
  keyValue,
  tableConstructor,
  listType,
  functionCall,
  IntegerType,
  associativity,
  isBinary,
} from "IR";
import { PolygolfError } from "./errors";
import { calcType } from "./getType";

const ascii = (x: number | IntegerType = int(0)) => text(x, true);

/** returns identifier expression of given type */
function e(type: Type): Identifier {
  return { ...id("", true), type };
}

function testExpr(
  name: string,
  expr: Expr,
  result: Type | "error",
  prog = program(block([]))
) {
  test(name, () => {
    if (result === "error") expect(() => calcType(expr, prog)).toThrow();
    else expect(toString(calcType(expr, prog))).toEqual(toString(result));
  });
}

function testPolygolfOp(
  name: string,
  op: OpCode,
  args: Type[],
  result: Type | "error"
) {
  testExpr(name, { kind: "PolygolfOp", op, args: args.map(e) }, result);
}

function describePolygolfOp(op: OpCode, tests: [Type[], Type | "error"][]) {
  describe("OpCode " + op, () => {
    for (const [args, result] of tests) {
      testPolygolfOp(
        "(" +
          args.map(toString).join(", ") +
          ") -> " +
          (result === "error" ? "error" : toString(result)),
        op,
        args,
        result
      );
    }
  });
}

function describeArithmeticOp(op: OpCode, tests: [Type[], Type | "error"][]) {
  describePolygolfOp(op, [
    [[text(), text()], "error"],
    [[int(), bool], "error"],
    [[int(), text()], "error"],
    isBinary(op) && associativity(op) === "both"
      ? [[text(), int()], "error"]
      : [[int(), int(), int()], "error"],
    ...tests,
  ]);
}

describe("Block", () => {
  testExpr("block", block([]), voidType);
});

describe("Variants", () => {
  testExpr("variants", variants([e(int()), e(bool)]), "error");
  testExpr("variants", variants([e(int(10, 30)), e(int(20, 40))]), int(10, 40));
});

describe("Assignment", () => {
  testExpr("assign bool to int", assignment(e(int()), e(bool)), "error");
  testExpr(
    "assign empty list",
    assignment(e(list(text())), listConstructor([])),
    list("void")
  );
  test("Self-referential assignment", () => {
    const aLHS = id("a");
    const expr = assignment(aLHS, polygolfOp("add", id("a"), e(int(1))));
    expect(() => calcType(aLHS, program(block([expr])))).toThrow(PolygolfError);
  });
});

describe("Functions", () => {
  testExpr(
    "Function call wrong types",
    functionCall([integerLiteral(1n)], id("f", false)),
    "error",
    program(block([]))
  );
});

describe("Index call", () => {
  testExpr("Index int", indexCall(e(int()), e(int())), "error");
  testExpr("Index array", indexCall(e(array(int(), 10)), e(int())), "error");
  testExpr(
    "Index array",
    indexCall(e(array(int(), 10)), e(int(10, 10))),
    "error"
  );
  testExpr(
    "Index array",
    indexCall(e(array(int(), 10)), e(int(0, 0)), undefined, true),
    "error"
  );
  testExpr(
    "Index array",
    indexCall(e(array(text(), 10)), e(int(0, 9))),
    text()
  );
  testExpr(
    "Index list",
    indexCall(e(list(int())), e(int(0, 0)), undefined, true),
    "error"
  );
  testExpr("Index list", indexCall(e(list(int())), e(int())), "error");
  testExpr("Index list", indexCall(e(list(text())), e(int(0))), text());
});

describe("Literals", () => {
  testExpr("int", integerLiteral(4n), int(4, 4));
  testExpr("text", stringLiteral("ahoj"), ascii(int(4, 4)));
  testExpr("text", stringLiteral("dobrý den"), text(int(9, 9)));
  testExpr("bool", polygolfOp("true"), bool);
  testExpr("bool", polygolfOp("false"), bool);
  testExpr("array", arrayConstructor([e(int()), e(text())]), "error");
  testExpr(
    "array",
    arrayConstructor([e(int(10, 30)), e(int(20, 40))]),
    array(int(10, 40), 2)
  );
  testExpr("list", listConstructor([e(int()), e(text())]), "error");
  testExpr(
    "list",
    listConstructor([e(int(10, 30)), e(int(20, 40))]),
    list(int(10, 40))
  );
  testExpr("set", setConstructor([e(int()), e(text())]), "error");
  testExpr(
    "set",
    setConstructor([e(int(10, 30)), e(int(20, 40))]),
    set(int(10, 40))
  );
  testExpr(
    "table",
    tableConstructor([
      keyValue(e(text()), e(int())),
      keyValue(e(text()), e(text())),
    ]),
    "error"
  );
  testExpr("table", tableConstructor([e(text()) as any, e(int())]), "error");
  testExpr(
    "table",
    tableConstructor([
      keyValue(e(text(10)), e(int(100, 200))),
      keyValue(e(text(20)), e(int(-100, -50))),
    ]),
    table(text(20), int(-100, 200))
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

describePolygolfOp("or", [
  [[bool, int()], "error"],
  [[bool], "error"],
  [[bool, bool], bool],
]);

describePolygolfOp("and", [
  [[bool, int()], "error"],
  [[bool], "error"],
  [[bool, bool], bool],
]);

describePolygolfOp("array_contains", [
  [[int(), array(int(), 10)], "error"],
  [[list(int()), int()], "error"],
  [[array(int(), 10), text()], "error"],
  [[array(int(), 10), int()], bool],
]);

describePolygolfOp("list_contains", [
  [[int(), list(int())], "error"],
  [[array(int(), 10), int()], "error"],
  [[list(int()), text()], "error"],
  [[list(int()), int()], bool],
]);

describePolygolfOp("table_contains_key", [
  [[text(), table(text(), int())], "error"],
  [[table(text(), int()), int()], "error"],
  [[table(text(), int()), text()], bool],
]);

describePolygolfOp("set_contains", [
  [[int(), set(int())], "error"],
  [[set(int()), text()], "error"],
  [[set(int()), int()], bool],
]);

describePolygolfOp("array_get", [
  [[int(0, 3), array(int(), 4)], "error"],
  [[array(int(), 4), text()], "error"],
  [[array(int(), 4), int()], "error"],
  [[array(int(), 4), int(1, 4)], "error"],
  [[array(int(-300, 300), 4), int(0, 3)], int(-300, 300)],
]);

describePolygolfOp("list_get", [
  [[int(0), list(int())], "error"],
  [[list(int()), text()], "error"],
  [[list(int()), int()], "error"],
  [[list(int(-300, 300)), int(0)], int(-300, 300)],
]);

describePolygolfOp("table_get", [
  [[text(), table(text(), int())], "error"],
  [[table(text(), int()), int()], "error"],
  [[table(text(5), int()), text()], "error"],
  [[table(text(), int()), text()], int()],
]);

describePolygolfOp("argv_get", [
  [[int()], "error"],
  [[int(0)], text()],
]);

describePolygolfOp("list_push", [
  [[int(), list(int())], "error"],
  [[list(int(0, 1000)), int()], "error"],
  [[list(int(0, 1000)), int(100, 200)], int(0, 1000)],
]);

describePolygolfOp("concat", [
  [[text(), int()], "error"],
  [[text(), text()], text()],
  [[ascii(), text(100, true)], ascii()],
  [[text(20), text(30, true)], text(50)],
  [
    [ascii(int(10, 20)), ascii(int(1, 5)), text(int(100, 100))],
    text(int(111, 125)),
  ],
]);

describePolygolfOp("repeat", [
  [[text(), text()], "error"],
  [[int(), text()], "error"],
  [[text(), int()], "error"],
  [[text(), int(0)], text()],
  [[ascii(), int(0)], ascii()],
  [[text(int(10, 20), true), int(3, 5)], text(int(30, 100), true)],
]);

describePolygolfOp("text_contains", [
  [[text(), int()], "error"],
  [[text(), text()], bool],
]);

describePolygolfOp("text_codepoint_find", [
  [[text(), int()], "error"],
  [[text(), text()], "error"],
  [[text(), text(int(1, 1))], int(-1)],
  [[text(100), text(int(10))], int(-1, 90)],
]);

describePolygolfOp("text_byte_find", [
  [[text(), int()], "error"],
  [[text(), text()], "error"],
  [[text(), text(int(1, 1))], int(-1)],
  [[text(100), text(int(10))], int(-1, 390)],
  [[ascii(100), text(int(10))], int(-1, 90)],
]);

describePolygolfOp("text_split", [
  [[text(), int()], "error"],
  [[text(), text()], listType(text())],
  [[text(500), text()], listType(text(500))],
]);

describePolygolfOp("text_get_byte", [
  [[text(), text()], "error"],
  [[text(), int()], "error"],
  [[text(), int(0)], text(int(1, 1))],
  [[ascii(), int(0)], ascii(int(1, 1))],
]);

describePolygolfOp("text_get_codepoint", [
  [[text(), text()], "error"],
  [[text(), int()], "error"],
  [[text(), int(0)], text(int(1, 1))],
  [[ascii(), int(0)], ascii(int(1, 1))],
]);

describePolygolfOp("text_codepoint_ord", [
  [[text(), text()], "error"],
  [[text(), int()], "error"],
  [[text(), int(0)], int(0, 0x10ffff)],
  [[ascii(), int(0)], int(0, 127)],
]);

describePolygolfOp("text_byte_ord", [
  [[text(), text()], "error"],
  [[text(), int()], "error"],
  [[text(), int(0)], int(0, 255)],
  [[ascii(), int(0)], int(0, 127)],
]);

describePolygolfOp("join_using", [
  [[text(), text()], "error"],
  [[text(), list(text())], "error"],
  [[list(text()), int()], "error"],
  [[list(text()), text()], text()],
  [[list(text()), ascii()], text()],
  [[list(ascii()), text()], text()],
  [[list(ascii()), ascii()], ascii()],
]);

describePolygolfOp("right_align", [
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

describePolygolfOp("not", [
  [[bool, bool], "error"],
  [[int()], "error"],
  [[int(0, 1)], "error"],
  [[bool], bool],
]);

describePolygolfOp("int_to_text", [
  [[bool], "error"],
  [[text()], "error"],
  [[int()], ascii(int(1))],
  [[int(-300, 5)], ascii(int(1, 4))],
  [[int(-5, 500)], ascii(int(1, 3))],
  [[int(-5, 5)], ascii(int(1, 2))],
]);

describePolygolfOp("int_to_bin", [
  [[bool], "error"],
  [[text()], "error"],
  [[int()], "error"],
  [[int(0)], ascii(int(1))],
  [[int(0, 0b1111)], ascii(int(1, 4))],
  [[int(0, 0b10000)], ascii(int(1, 5))],
]);

describePolygolfOp("int_to_hex", [
  [[bool], "error"],
  [[text()], "error"],
  [[int()], "error"],
  [[int(0)], ascii(int(1))],
  [[int(0, 0xffff)], ascii(int(1, 4))],
  [[int(0, 0x10000)], ascii(int(1, 5))],
]);

describePolygolfOp("text_to_int", [
  [[bool], "error"],
  [[int()], "error"],
  [[text()], "error"],
  [[ascii(1)], int(0, 9)],
  [[ascii(3)], int(-99, 999)],
  [[ascii(5)], int(-9999, 99999)],
]);

describePolygolfOp("bool_to_int", [
  [[int()], "error"],
  [[bool], int(0, 1)],
]);

describePolygolfOp("byte_to_text", [
  [[text()], "error"],
  [[int(0)], "error"],
  [[int(0, 255)], text(int(1, 1))],
  [[int(0, 127)], ascii(int(1, 1))],
]);

describePolygolfOp("int_to_codepoint", [
  [[text()], "error"],
  [[int(0)], "error"],
  [[int(0, 0x10ffff)], text(int(1, 1))],
  [[int(0, 127)], ascii(int(1, 1))],
]);

describePolygolfOp("list_length", [
  [[list(int()), int()], "error"],
  [[array(int(), 10)], "error"],
  [[list(int())], int(0)],
]);

describePolygolfOp("text_codepoint_length", [
  [[list(int())], "error"],
  [[text(int(20, 58))], int(20, 58)],
  [[ascii(int(20, 58))], int(20, 58)],
]);

describePolygolfOp("text_byte_length", [
  [[list(int())], "error"],
  [[text(int(20, 58))], int(20, 4 * 58)],
  [[ascii(int(20, 58))], int(20, 58)],
]);

describePolygolfOp("text_split_whitespace", [
  [[list(text())], "error"],
  [[text(58)], list(text(58))],
]);

describePolygolfOp("sorted", [
  [[array(text(), 5)], "error"],
  [[set(text())], "error"],
  [[table(text(), text())], "error"],
  [[text()], "error"],
  [[list(int())], list(int())],
  [[list(text())], list(text())],
]);

describePolygolfOp("join", [
  [[list(int())], "error"],
  [[list(text()), text()], "error"],
  [[list(text())], text()],
]);

describePolygolfOp("text_byte_reversed", [
  [[list(text())], "error"],
  [[text()], text()],
]);

describePolygolfOp("text_codepoint_reversed", [
  [[list(text())], "error"],
  [[text()], text()],
]);

describePolygolfOp("argv", [
  [[int(0)], "error"],
  [[], list(text())],
]);

describePolygolfOp("argc", [
  [[int(0)], "error"],
  [[], int(0, 2 ** 31 - 1)],
]);

describePolygolfOp("text_replace", [
  [[text(), text()], "error"],
  [[text(), text(), text()], "error"],
  [[text(), text(int(1)), text()], text()],
  [[text(58), text(int(1)), text()], text()],
  [[text(), text(int(1)), text(58)], text()],
  [[text(58), text(int(1)), text(58)], text(58 * 58)],
]);

describePolygolfOp("text_get_codepoint_slice", [
  [[text(), int(0)], "error"],
  [[text(), int(), int()], "error"],
  [[text(), int(0), int(0)], text()],
  [[text(58), int(0), int(0)], text(58)],
  [[text(), int(0), int(0, 58)], text(58)],
  [[text(), int(30, 200), int(0, 58)], text(28)],
]);

describePolygolfOp("text_get_byte_slice", [
  [[text(), int(0)], "error"],
  [[text(), int(), int()], "error"],
  [[text(), int(0), int(0)], text()],
  [[text(58), int(0), int(0)], text(58)],
  [[text(), int(0), int(0, 58)], text(58)],
  [[text(), int(30, 200), int(0, 58)], text(28)],
]);

describePolygolfOp("array_set", [
  [[array(int(), 4), text(), int()], "error"],
  [[array(int(), 4), int(), int()], "error"],
  [[array(int(), 4), int(1, 4), int()], "error"],
  [[array(int(-300, 300), 4), int(0, 3), text()], "error"],
  [[array(int(-300, 300), 4), int(0, 3), int(10, 20)], int(-300, 300)],
]);

describePolygolfOp("list_set", [
  [[list(int()), text(), int()], "error"],
  [[list(int()), int(), int()], "error"],
  [[list(int(-300, 300)), int(0), text()], "error"],
  [[list(int(-300, 300)), int(0), int(10, 20)], int(-300, 300)],
]);

describePolygolfOp("table_set", [
  [[table(text(), int()), int(), text()], "error"],
  [[table(text(5), int()), text(), int()], "error"],
  [[table(text(5), int(0)), text(5), int()], "error"],
  [[table(text(5), int(0)), text(), int(0)], "error"],
  [[table(text(5), int(0)), text(4), int(100)], int(0)],
]);
