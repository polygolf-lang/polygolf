import { assignment, int } from "../../IR/builders";
import lua from ".";
import { IR, block, program, application, stringLiteral, id } from "../../IR";

function expectTransform(program: IR.Program, output: string) {
  expect(lua(program)).toEqual(output);
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

test("Assignment", () => expectStatement(assignment("b", int(1n)), "b=1"));

describe("Applications", () => {
  testApplication("print", [stringLiteral("abc")], `io.write("abc")`);
  testApplication("println", [stringLiteral("abc")], `print("abc")`);
  testApplication("str_length", [id("s")], `s:len()`);
  testApplication("int_to_str", [id("x")], "tostring(x)");
  testApplication("str_to_int", [id("x")], "~~x");
  testApplication("bitnot", [id("x")], "~x");
  testApplication("neg", [id("x")], "-x");
  testApplication("add", [id("x"), id("y")], "x+y");
  testApplication("sub", [id("x"), id("y")], "x-y");
  testApplication("mul", [id("x"), id("y")], "x*y");
  testApplication("div", [id("x"), id("y")], "x//y");
  testApplication("exp", [id("x"), id("y")], "x^y");
  testApplication("mod", [id("x"), id("y")], "x%y");
  testApplication("bitand", [id("x"), id("y")], "x&y");
  testApplication("bitor", [id("x"), id("y")], "x|y");
  testApplication("bitxor", [id("x"), id("y")], "x~y");
  testApplication("lt", [id("x"), id("y")], "x<y");
  testApplication("leq", [id("x"), id("y")], "x<=y");
  testApplication("eq", [id("x"), id("y")], "x==y");
  testApplication("geq", [id("x"), id("y")], "x>=y");
  testApplication("gt", [id("x"), id("y")], "x>y");
  testApplication("array_get", [id("x"), id("y")], "x[y+1]");
  testApplication("str_get_byte", [id("x"), id("y")], "x:byte(y+1)");
  testApplication("str_concat", [id("x"), id("y")], "x..y");
});

describe("Parentheses", () => {
  testStatement(
    "method call on string",
    application("str_length", [stringLiteral("abc")]),
    `("abc"):len()`
  );
  // Currently fails because transformBuiltins should be done on exit, not enter
  // testStatement(
  //   "method call on ArrayGet",
  //   application("str_length", [application("array_get", [id("A"), id("i")])]),
  //   `A[i]:len()`
  // );
  // TODO: operator precedence
});

// TODO: Loops and some more tests
