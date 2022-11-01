import {
  assignment,
  Expr,
  id,
  int,
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
  listType,
  arrayType,
  Node,
  textType,
  booleanType,
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

function testBlockParse(desc: string, str: string, output: Node[]) {
  test(desc, () => {
    expect(stringify(parse(str).block.children)).toEqual(stringify(output));
  });
}

function testStmtParse(desc: string, str: string, output: Node) {
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
  expectExprParse("true nullary op", "true", polygolfOp("true"));
  expectExprParse("argv nullary op", "argv", polygolfOp("argv"));
  expectExprParse(
    "user function",
    "($f 1 2)",
    functionCall([int(1n), int(2n)], id("f"))
  );
  expectExprParse(
    "user function on variables",
    "($f $x $y)",
    functionCall([id("x"), id("y")], id("f"))
  );
  expectExprParse("add", "(add $x $y)", polygolfOp("add", id("x"), id("y")));
  expectExprParse(
    "add infix",
    "($x + $y)",
    polygolfOp("add", id("x"), id("y"))
  );
  expectExprParse(
    "mod infix",
    "($x mod $y)",
    polygolfOp("mod", id("x"), id("y"))
  );
  expectExprParse("or", "(or $x $y)", polygolfOp("or", id("x"), id("y")));
  expectExprParse("println", "(println $x)", print(id("x"), true));
  expectExprParse("print", "(print $x)", print(id("x"), false));
  expectExprParse("assign", "(assign $x 5)", assignment(id("x"), int(5n)));
  expectExprParse("assign infix", "($x <- 5)", assignment(id("x"), int(5n)));
  expectExprParse(
    "list",
    "(list 1 2 3)",
    listConstructor([int(1n), int(2n), int(3n)])
  );
  expectExprParse(
    "+",
    "(+ $x $y $z $w)",
    polygolfOp(
      "add",
      polygolfOp("add", polygolfOp("add", id("x"), id("y")), id("z")),
      id("w")
    )
  );
  expectExprParse(
    "..",
    "(.. $x $y $z)",
    polygolfOp(
      "str_concat",
      polygolfOp("str_concat", id("x"), id("y")),
      id("z")
    )
  );
  expectExprParse("- as neg", "(- $x)", polygolfOp("neg", id("x")));
  expectExprParse("- as sub", "(- $x $y)", polygolfOp("sub", id("x"), id("y")));
  expectExprParse("~ as bitnot", "(~ $x)", polygolfOp("bitnot", id("x")));
  expectExprParse(
    "~ as bitxor",
    "(~ $x $y)",
    polygolfOp("bitxor", id("x"), id("y"))
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
  expectExprParse("bool", "$a:Bool", annotate(id("a"), booleanType));
  expectExprParse("text", "$a:Text", annotate(id("a"), textType()));
  expectExprParse(
    "text of max 120 length",
    "$a:(Text 120)",
    annotate(id("a"), textType(120))
  );
  expectExprParse(
    "array of 5 strings",
    "$a:(Array Text 5)",
    annotate(id("a"), arrayType(textType(), 5))
  );
  expectExprParse(
    "list of strings",
    "$a:(List Text)",
    annotate(id("a"), listType(textType()))
  );
  expectExprParse(
    "list of lists of strings",
    "$a:(List (List Text))",
    annotate(id("a"), listType(listType(textType())))
  );
  expectExprParse(
    "list of ints",
    "$a:(List -999..999)",
    annotate(id("a"), listType(integerType(-999, 999)))
  );
});

describe("Parse statements", () => {
  testBlockParse("comment", `%one\nprintln 58;%two\n%println -3;`, [
    print(int(58n), true),
  ]);
  testStmtParse("infix assignment", "$x <- 5;", assignment(id("x"), int(5n)));
  testStmtParse(
    "if",
    "if $x [ println $y; ];",
    ifStatement(id("x"), block([print(id("y"), true)]))
  );
  testStmtParse(
    "forRange",
    "for $x 1 20 1 [ println $x; ];",
    forRange(id("x"), int(1n), int(20n), int(1n), block([print(id("x"), true)]))
  );
});

describe("Parse variants", () => {
  testStmtParse(
    "Two variants",
    `{ println $x; / print $x; print "\\n"; }`,
    variants([
      block([print(id("x"), true)]),
      block([print(id("x"), false), print(stringLiteral("\n"), false)]),
    ])
  );
  testStmtParse(
    "Three variants",
    `{ println $x; / print $x; print "\\n"; / print $x; print "\\n"; }`,
    variants([
      block([print(id("x"), true)]),
      block([print(id("x"), false), print(stringLiteral("\n"), false)]),
      block([print(id("x"), false), print(stringLiteral("\n"), false)]),
    ])
  );
  testStmtParse(
    "Expression variants",
    `println { 0 / 1 };`,
    print(variants([block([int(0n)]), block([int(1n)])]), true)
  );
});
