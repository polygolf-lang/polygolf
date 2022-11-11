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
  ValueType,
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
} from "IR";
import { calcType } from "./getType";

function stringify(x: any): string {
  return JSON.stringify(
    x,
    (key, value) =>
      typeof value === "bigint" ? value.toString() + "n" : value,
    2
  );
}

function e(type: ValueType): Identifier {
  // returns identifier expression of given type
  const result = id("", true);
  result.valueType = type;
  return result;
}

function testExpr(name: string, expr: Expr, result: ValueType | "error") {
  test(name, () => {
    if (result === "error")
      expect(() => calcType(expr, program(block([])))).toThrow();
    else
      expect(stringify(calcType(expr, program(block([]))))).toEqual(
        stringify(result)
      );
  });
}

function testPolygolfOp(
  name: string,
  op: OpCode,
  args: ValueType[],
  result: ValueType | "error"
) {
  testExpr(name, polygolfOp(op, ...args.map(e)), result);
}

function describePolygolfOp(
  op: OpCode,
  tests: [ValueType[], ValueType | "error"][]
) {
  describe("OpCode " + op, () => {
    for (const [args, result] of tests) {
      testPolygolfOp(
        op +
          "::(" +
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

function describeArithmeticOp(
  op: OpCode,
  tests: [ValueType[], ValueType | "error"][]
) {
  describePolygolfOp(op, [
    [[text(), text()], "error"],
    [[int(), bool], "error"],
    [[int(), text()], "error"],
    [[int(), int(), int()], "error"],
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
  testExpr("text", stringLiteral("ahoj"), text(4));
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

describeArithmeticOp("add", [
  [[int()], "error"],
  [[int(), int()], int()],
  [[int(), int(-10, 10)], int()],
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

describeArithmeticOp("add", [
  [[int()], "error"],
  [[int(), int()], int()],
  [[int(), int(-10, 10)], int()],
  [[int(30, 200), int(-100, 10)], int(-70, 210)],
  [[int(30, 30), int(-100, -100)], int(-70, -70)],
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

describePolygolfOp("text_get_byte", [
  [[text(), int()], "error"],
  [[text(), int(0)], int(0, 255)],
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

describePolygolfOp("text_concat", [
  [[text(), int()], "error"],
  [[text(), text()], text()],
  [[text(), text(100)], text()],
  [[text(20), text(30)], text(50)],
]);

describePolygolfOp("text_contains", [
  [[text(), int()], "error"],
  [[text(), text()], bool],
]);

describePolygolfOp("text_find", [
  [[text(), int()], "error"],
  [[text(), text()], int(-1)],
  [[text(100), text()], int(-1, 99)],
]);

describePolygolfOp("text_split", [
  [[text(), int()], "error"],
  [[text(), text()], listType(text())],
  [[text(500), text()], listType(text(500))],
]);

describePolygolfOp("text_get_char", [
  [[text(), text()], "error"],
  [[text(), int()], "error"],
  [[text(), int(0)], text(1)],
]);

describePolygolfOp("join_using", [
  [[text(), text()], "error"],
  [[text(), list(text())], "error"],
  [[list(text()), int()], "error"],
  [[list(text()), text()], text()],
]);

describePolygolfOp("right_align", [
  [[text(), text()], "error"],
  [[text(), int()], "error"],
  [[text(), int(0)], text()],
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
