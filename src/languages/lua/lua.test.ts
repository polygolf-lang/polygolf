import lua from ".";
import {
  IR,
  assignment,
  int,
  block,
  program,
  stringLiteral,
  id,
  unaryOp,
  binaryOp,
  arrayGet,
  print,
  stringGet,
} from "../../IR";
import { applyLanguage } from "../../common/applyLanguage";

function expectTransform(program: IR.Program, output: string) {
  expect(applyLanguage(lua, program)).toEqual(output);
}

function expectStatement(statement: IR.Statement, output: string) {
  expectTransform(program(block([statement])), output);
}

function testStatement(desc: string, statement: IR.Statement, output: string) {
  test(desc, () => expectStatement(statement, output));
}

function testBinaryOp(
  op: IR.BuiltinBinop,
  left: IR.Expr,
  right: IR.Expr,
  output: string
) {
  testStatement(op, binaryOp(op, left, right), output);
}

function testUnaryOp(op: IR.BuiltinUnary, arg: IR.Expr, output: string) {
  testStatement(op, unaryOp(op, arg), output);
}

test("Assignment", () => expectStatement(assignment("b", int(1n)), "b=1"));

describe("Applications", () => {
  testStatement(
    "printnoln",
    print(stringLiteral("abc"), false),
    `io.write("abc")`
  );
  testStatement("println", print(stringLiteral("abc")), `print("abc")`);
  testUnaryOp("str_length", id("s"), `s:len()`);
  testUnaryOp("int_to_str", id("x"), "tostring(x)");
  testUnaryOp("str_to_int", id("x"), "~~x");
  testUnaryOp("bitnot", id("x"), "~x");
  testUnaryOp("neg", id("x"), "-x");
  testBinaryOp("add", id("x"), id("y"), "x+y");
  testBinaryOp("sub", id("x"), id("y"), "x-y");
  testBinaryOp("mul", id("x"), id("y"), "x*y");
  testBinaryOp("div", id("x"), id("y"), "x//y");
  testBinaryOp("exp", id("x"), id("y"), "x^y");
  testBinaryOp("mod", id("x"), id("y"), "x%y");
  testBinaryOp("bitand", id("x"), id("y"), "x&y");
  testBinaryOp("bitor", id("x"), id("y"), "x|y");
  testBinaryOp("bitxor", id("x"), id("y"), "x~y");
  testBinaryOp("lt", id("x"), id("y"), "x<y");
  testBinaryOp("leq", id("x"), id("y"), "x<=y");
  testBinaryOp("eq", id("x"), id("y"), "x==y");
  testBinaryOp("geq", id("x"), id("y"), "x>=y");
  testBinaryOp("gt", id("x"), id("y"), "x>y");
  testStatement("ArrayGet", arrayGet(id("x"), id("y")), "x[y+1]");
  testStatement("StringGet", stringGet(id("x"), id("y")), "x:byte(y+1)");
  testBinaryOp("str_concat", id("x"), id("y"), "x..y");
});

describe("Parentheses", () => {
  testStatement(
    "method call on string",
    unaryOp("str_length", stringLiteral("abc")),
    `("abc"):len()`
  );
  testStatement(
    "method call on ArrayGet",
    unaryOp("str_length", arrayGet(id("A"), id("i"))),
    `A[i+1]:len()`
  );
  // TODO: operator precedence
});

// TODO: Loops and some more tests
