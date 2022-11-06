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
import applyLanguage from "../../common/applyLanguage";

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
  testpolygolfOp("text_length", ["t"], `t:len()`);
  testpolygolfOp("int_to_text", ["i"], "tostring(i)");
  testpolygolfOp("text_to_int", ["t"], "~~t");
  testpolygolfOp("bit_not", ["i"], "~i");
  testpolygolfOp("neg", ["i"], "-i");
  testpolygolfOp("add", ["i", "I"], "i+I");
  testpolygolfOp("sub", ["i", "I"], "i-I");
  testpolygolfOp("mul", ["i", "I"], "i*I");
  testpolygolfOp("div", ["i", "I"], "i//I");
  testpolygolfOp("pow", ["i", "I"], "i^I");
  testpolygolfOp("mod", ["i", "I"], "i%I");
  testpolygolfOp("bit_and", ["i", "I"], "i&I");
  testpolygolfOp("bit_or", ["i", "I"], "i|I");
  testpolygolfOp("bit_xor", ["i", "I"], "i~I");
  testpolygolfOp("lt", ["i", "I"], "i<I");
  testpolygolfOp("leq", ["i", "I"], "i<=I");
  testpolygolfOp("eq", ["i", "I"], "i==I");
  testpolygolfOp("geq", ["i", "I"], "i>=I");
  testpolygolfOp("gt", ["i", "I"], "i>I");
  testpolygolfOp("array_get", ["a", "i"], "a[i+1]");
  testpolygolfOp("text_get_byte", ["t", "i"], "t:byte(i+1)");
  testpolygolfOp("text_concat", ["t", "T"], "t..T");
  testpolygolfOp("text_length", ["t"], "t:len()");
});

describe("Parentheses", () => {
  testpolygolfOp("text_length", [stringLiteral("abc")], `("abc"):len()`);
});

// TODO: Loops and some more tests
