import { integerType as int, OpCode, ValueType } from "IR";
import { getArithmeticType } from "./getType";

function stringify(x: any): string {
  return JSON.stringify(
    x,
    (key, value) =>
      typeof value === "bigint" ? value.toString() + "n" : value,
    2
  );
}

function testPolygolfOp(
  op: OpCode,
  args: ValueType[],
  result: ValueType | "error"
) {
  test(op, () => {
    if (result === "error")
      expect(
        stringify(getArithmeticType(op, args[0] as any, args[1] as any))
      ).toThrow();
    else
      expect(
        stringify(getArithmeticType(op, args[0] as any, args[1] as any))
      ).toEqual(stringify(result));
  });
}

describe("Addition", () => {
  testPolygolfOp("add", [int(), int()], int());
  testPolygolfOp("add", [int(), int(-10, 10)], int());
  testPolygolfOp("add", [int(30, 200), int(-100, 10)], int(-70, 210));
  testPolygolfOp("add", [int(30, 30), int(-100, -100)], int(-70, -70));
});
describe("Subtraction", () => {
  testPolygolfOp("sub", [int(), int()], int());
  testPolygolfOp("sub", [int(), int(-10, 10)], int());
  testPolygolfOp("sub", [int(30, 200), int(-100, 10)], int(20, 300));
  testPolygolfOp("sub", [int(30, 30), int(-100, -100)], int(130, 130));
});
