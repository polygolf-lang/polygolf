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
  print,
  integerType,
  annotate,
  textType,
} from "../../IR";
import applyLanguage, { searchOptions } from "../../common/applyLanguage";

function expectTransform(program: IR.Program, output: string) {
  expect(applyLanguage(lua, program, searchOptions("full", "bytes"))).toEqual(
    output
  );
}

function expectStatement(statement: IR.Expr, output: string) {
  expectTransform(program(statement), output);
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
          assignment({ ...id("i"), type: integerType(0, 1) }, int(0n)),
          assignment({ ...id("I"), type: integerType(0, 4) }, int(4n)),
          assignment(
            "t",
            annotate(stringLiteral("abc"), textType(integerType(0, 10), true))
          ),
          assignment("T", annotate(stringLiteral("DEF"), textType())),
          assignment("b", polygolfOp("true")),
          assignment("B", polygolfOp("false")),
          assignment(
            "a",
            arrayConstructor([stringLiteral("xy"), stringLiteral("abc")])
          ),
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
a={"xy","abc"}
${output}`
    )
  );
}

describe("Applications", () => {
  test("Assignment", () => expectStatement(assignment("b", int(1n)), "b=1"));
  test("Prints", () =>
    expectStatement(
      block([
        print(stringLiteral("x"), false),
        print(stringLiteral("y"), true),
      ]),
      `io.write("x")\nprint("y")`
    ));
  testpolygolfOp("text_byte_length", ["t"], `t:len()`);
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
  testpolygolfOp("text_byte_length", ["t"], "t:len()");
});

describe("Parentheses", () => {
  testpolygolfOp(
    "text_byte_length",
    [annotate(stringLiteral("abc"), textType())],
    `("abc"):len()`
  );
  testpolygolfOp(
    "text_byte_length",
    [polygolfOp("array_get", id("a"), id("i"))],
    `a[i+1]:len()`
  );
});

// TODO: Loops and some more tests
