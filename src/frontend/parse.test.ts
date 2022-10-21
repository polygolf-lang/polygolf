import {
  assignment,
  Expr,
  id,
  int,
  Statement,
  stringLiteral,
  print,
  listConstructor,
  functionCall,
  polygolfOp,
  block,
  ifStatement,
  forRange,
  integerType,
  variants,
  annotate,
  simpleType,
  listType,
  arrayType,
} from "../IR";
import parse from "./parse";

function stringify(x: any): string {
  // Jest complains it cannot serialize bigint
  return JSON.stringify(
    x,
    (key, value) =>
      typeof value === "bigint" ? value.toString() + "n" : value,
    2
  );
}

function testBlockParse(desc: string, str: string, output: Statement[]) {
  test(desc, () => {
    expect(stringify(parse(str).block.children)).toEqual(stringify(output));
  });
}

function testStmtParse(desc: string, str: string, output: Statement) {
  testBlockParse(desc, str, [output]);
}

function expectExprParse(desc: string, str: string, output: Expr) {
  testStmtParse(desc, `assign $x ${str};`, assignment("x", output));
}

describe("Parse literals", () => {
  expectExprParse("single digit", "5", int(5n));
  expectExprParse("negative integer", "-123", int(-123n));
  expectExprParse("variable", "$y", id("y"));
  expectExprParse("string literal", '"abc"', stringLiteral("abc"));
  expectExprParse(
    "string with escapes",
    '"\\u0001\\r"',
    stringLiteral("\u0001\r")
  );
});

describe("Parse s-expressions", () => {
  expectExprParse(
    "user function",
    "($f 1 2)",
    functionCall([int(1n), int(2n)], id("f"))
  );
  expectExprParse("add", "(add $x $y)", polygolfOp("add", id("x"), id("y")));
  expectExprParse("or", "(or $x $y)", polygolfOp("or", id("x"), id("y")));
  expectExprParse("println", "(println $x)", print(id("x"), true));
  expectExprParse("print", "(print $x)", print(id("x"), false));
  expectExprParse("assign", "(assign $x 5)", assignment(id("x"), int(5n)));
  expectExprParse(
    "list",
    "(list 1 2 3)",
    listConstructor([int(1n), int(2n), int(3n)])
  );
});

describe("Parse annotations", () => {
  expectExprParse(
    "integer -oo..oo",
    "$a:-oo..oo",
    annotate(id("a"), integerType())
  );
  expectExprParse(
    "integer 0..oo",
    "$a:0..oo",
    annotate(id("a"), integerType(0, undefined))
  );
  expectExprParse(
    "integer -10..10",
    "$a:-10..10",
    annotate(id("a"), integerType(-10, 10))
  );
  expectExprParse("text", "$a:Text", annotate(id("a"), simpleType("string")));
  expectExprParse("bool", "$a:Bool", annotate(id("a"), simpleType("boolean")));
  expectExprParse(
    "array of 5 strings",
    "$a:(Array Text 5)",
    annotate(id("a"), arrayType("string", 5))
  );
  expectExprParse(
    "list of strings",
    "$a:(List Text)",
    annotate(id("a"), listType("string"))
  );
  expectExprParse(
    "list of lists of strings",
    "$a:(List (List Text))",
    annotate(id("a"), listType(listType("string")))
  );
  expectExprParse(
    "list of ints",
    "$a:(List -999..999)",
    annotate(id("a"), listType(integerType(-999, 999)))
  );
});

describe("Parse statements", () => {
  testBlockParse("comment", `#one\nprintln 58;#two\n#println -3;`, [
    print(int(58n), true),
  ]);
  testStmtParse(
    "if",
    "if $x [ println $y; ];",
    ifStatement(id("x"), block([print(id("y"), true)]))
  );
  testStmtParse(
    "forRange",
    "forRange $x 1 20 1 [ println $x; ];",
    forRange(
      id("x"),
      { ...int(1n), valueType: integerType(1, 1) },
      { ...int(20n), valueType: integerType(20, 20) },
      int(1n),
      block([print(id("x"), true)])
    )
  );
});

describe("Parse variants", () => {
  testStmtParse(
    "Two variants",
    `{ println $x; | print $x; print "\\n"; }`,
    variants([
      block([print(id("x"), true)]),
      block([print(id("x"), false), print(stringLiteral("\n"), false)]),
    ])
  );
  testStmtParse(
    "Three variants",
    `{ println $x; | print $x; print "\\n"; | print $x; print "\\n"; }`,
    variants([
      block([print(id("x"), true)]),
      block([print(id("x"), false), print(stringLiteral("\n"), false)]),
      block([print(id("x"), false), print(stringLiteral("\n"), false)]),
    ])
  );
});