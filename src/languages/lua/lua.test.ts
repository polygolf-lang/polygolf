import { assignment, int } from "../../IR/builders";
import lua from ".";
import {
  IR,
  block,
  program,
  application,
  stringLiteral,
  id,
  unaryOp,
  binaryOp,
  arrayGet,
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

function testApplication(func: IR.Builtin, args: IR.Expr[], output: string) {
  testStatement(func, application(func, args), output);
}

function testBinaryOp(
  op: string,
  left: IR.Expr,
  right: IR.Expr,
  output: string
) {
  testStatement(op, binaryOp(op, left, right), output);
}

test("Assignment", () => expectStatement(assignment("b", int(1n)), "b=1"));

describe("Applications", () => {
  testApplication("print", [stringLiteral("abc")], `io.write("abc")`);
  testApplication("println", [stringLiteral("abc")], `print("abc")`);
  testApplication("str_length", [id("s")], `s:len()`);
  testApplication("int_to_str", [id("x")], "tostring(x)");
  testApplication("str_to_int", [id("x")], "~~x");
  testStatement("bitnot", unaryOp("bitnot", id("x")), "~x");
  testStatement("neg", unaryOp("neg", id("x")), "-x");
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
  testApplication("str_get_byte", [id("x"), id("y")], "x:byte(y+1)");
  testBinaryOp("str_concat", id("x"), id("y"), "x..y");
});

describe("Parentheses", () => {
  testStatement(
    "method call on string",
    application("str_length", [stringLiteral("abc")]),
    `("abc"):len()`
  );
  testStatement(
    "method call on ArrayGet",
    application("str_length", [arrayGet(id("A"), id("i"))]),
    `A[i+1]:len()`
  );
  // TODO: operator precedence
});

// TODO: Loops and some more tests
