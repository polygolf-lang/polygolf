import lua from ".";
import {
  IR,
  assignment,
  int,
  block,
  program,
  stringLiteral,
  id,
  polygolfOp,
  print,
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

function testpolygolfOp(
  op: IR.OpCode,
  args: (IR.Expr | string)[],
  output: string
) {
  testStatement(
    op,
    polygolfOp(op, ...args.map((x) => (typeof x === "string" ? id(x) : x))),
    output
  );
}

test("Assignment", () => expectStatement(assignment("b", int(1n)), "b=1"));

describe("Applications", () => {
  testStatement(
    "printnoln",
    print(stringLiteral("abc"), false),
    `io.write("abc")`
  );
  testStatement("println", print(stringLiteral("abc")), `print("abc")`);
  testpolygolfOp("str_length", ["s"], `s:len()`);
  testpolygolfOp("int_to_str", ["x"], "tostring(x)");
  testpolygolfOp("str_to_int", ["x"], "~~x");
  testpolygolfOp("bitnot", ["x"], "~x");
  testpolygolfOp("neg", ["x"], "-x");
  testpolygolfOp("add", ["x", "y"], "x+y");
  testpolygolfOp("sub", ["x", "y"], "x-y");
  testpolygolfOp("mul", ["x", "y"], "x*y");
  testpolygolfOp("div", ["x", "y"], "x//y");
  testpolygolfOp("exp", ["x", "y"], "x^y");
  testpolygolfOp("mod", ["x", "y"], "x%y");
  testpolygolfOp("bitand", ["x", "y"], "x&y");
  testpolygolfOp("bitor", ["x", "y"], "x|y");
  testpolygolfOp("bitxor", ["x", "y"], "x~y");
  testpolygolfOp("lt", ["x", "y"], "x<y");
  testpolygolfOp("leq", ["x", "y"], "x<=y");
  testpolygolfOp("eq", ["x", "y"], "x==y");
  testpolygolfOp("geq", ["x", "y"], "x>=y");
  testpolygolfOp("gt", ["x", "y"], "x>y");
  testStatement(
    "ArrayGet",
    polygolfOp("array_get", id("x"), id("y")),
    "x[y+1]"
  );
  testStatement(
    "StringGet",
    polygolfOp("str_get_byte", id("x"), id("y")),
    "x:byte(y+1)"
  );
  testpolygolfOp("str_concat", ["x", "y"], "x..y");
});

describe("Parentheses", () => {
  testStatement(
    "method call on string",
    polygolfOp("str_length", stringLiteral("abc")),
    `("abc"):len()`
  );
  testStatement(
    "method call on ArrayGet",
    polygolfOp("str_length", polygolfOp("array_get", id("A"), id("i"))),
    `A[i+1]:len()`
  );
  // TODO: operator precedence
});

// TODO: Loops and some more tests
