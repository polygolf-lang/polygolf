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
  arrayConstructor,
  Expr,
} from "../../IR";
import { applyLanguage } from "../../common/applyLanguage";

function expectTransform(program: IR.Program, output: string) {
  expect(applyLanguage(lua, program)).toEqual(output);
}

function expectStatement(statement: IR.Expr, output: string) {
  expectTransform(program(block([statement])), output);
}

function testpolygolfOp(
  op: IR.OpCode,
  args: ("i" | "I" | "t" | "T" | "b" | "B" | "a" | Expr)[],
  output: string
) {
  test(op, () =>
    expectTransform(
      program(
        block([
          assignment("i", int(0n)),
          assignment("I", int(4n)),
          assignment("t", stringLiteral("abc")),
          assignment("T", stringLiteral("DEF")),
          assignment("b", polygolfOp("true")),
          assignment("B", polygolfOp("false")),
          assignment("a", arrayConstructor([stringLiteral("xy")])),
          polygolfOp(
            op,
            ...args.map((x) => (typeof x === "string" ? id(x) : x))
          ),
        ])
      ),
      `i=0
I=4
t="abc"
T="DEF"
b=true
B=false
a={"xy"}
${output}`
    )
  );
}

test("Assignment", () => expectStatement(assignment("b", int(1n)), "b=1"));

describe("Applications", () => {
  testpolygolfOp("println", ["t"], `print(t)`);
  testpolygolfOp("print", ["t"], `io.write(t)`);
  testpolygolfOp("str_length", ["t"], `t:len()`);
  testpolygolfOp("int_to_str", ["i"], "tostring(i)");
  testpolygolfOp("str_to_int", ["t"], "~~t");
  testpolygolfOp("bitnot", ["i"], "~i");
  testpolygolfOp("neg", ["i"], "-i");
  testpolygolfOp("add", ["i", "I"], "i+I");
  testpolygolfOp("sub", ["i", "I"], "i-I");
  testpolygolfOp("mul", ["i", "I"], "i*I");
  testpolygolfOp("div", ["i", "I"], "i//I");
  testpolygolfOp("exp", ["i", "I"], "i^I");
  testpolygolfOp("mod", ["i", "I"], "i%I");
  testpolygolfOp("bitand", ["i", "I"], "i&I");
  testpolygolfOp("bitor", ["i", "I"], "i|I");
  testpolygolfOp("bitxor", ["i", "I"], "i~I");
  testpolygolfOp("lt", ["i", "I"], "i<I");
  testpolygolfOp("leq", ["i", "I"], "i<=I");
  testpolygolfOp("eq", ["i", "I"], "i==I");
  testpolygolfOp("geq", ["i", "I"], "i>=I");
  testpolygolfOp("gt", ["i", "I"], "i>I");
  testpolygolfOp("array_get", ["a", "i"], "a[i+1]");
  testpolygolfOp("str_get_byte", ["t", "i"], "t:byte(i+1)");
  testpolygolfOp("str_concat", ["t", "T"], "t..T");
  testpolygolfOp("str_length", ["t"], "t:len()");
});

describe("Parentheses", () => {
  testpolygolfOp("str_length", [stringLiteral("abc")], `("abc"):len()`);
});

// TODO: Loops and some more tests
