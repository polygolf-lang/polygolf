import { stringify } from "../common/stringify";
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
  Type,
} from "../IR";
import parse from "./parse";

function testStmtParse(desc: string, str: string, output: Node) {
  test(desc, () => {
    expect(stringify(parse(str, false).body)).toEqual(stringify(output));
  });
}

function expectExprParse(desc: string, str: string, output: Expr) {
  testStmtParse(desc, `assign $x ${str};`, assignment("x", output));
}

function expectTypeParse(type: string, output: Type) {
  expectExprParse(type, "$a:" + type, annotate(id("a"), output));
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
    polygolfOp("concat", polygolfOp("concat", id("x"), id("y")), id("z"))
  );
  expectExprParse("- as neg", "(- $x)", polygolfOp("neg", id("x")));
  expectExprParse("- as sub", "(- $x $y)", polygolfOp("sub", id("x"), id("y")));
  expectExprParse("~ as bitnot", "(~ $x)", polygolfOp("bit_not", id("x")));
  expectExprParse(
    "~ as bitxor",
    "(~ $x $y)",
    polygolfOp("bit_xor", id("x"), id("y"))
  );
});

describe("Parse annotations", () => {
  expectTypeParse("-oo..oo", integerType());
  expectTypeParse("0..oo", integerType(0, undefined));
  expectTypeParse("-10..10", integerType(-10, 10));
  expectTypeParse("Bool", booleanType);
  expectTypeParse("Text", textType());
  expectTypeParse("Ascii", textType(integerType(), true));
  expectTypeParse("(Text 120)", textType(120));
  expectTypeParse("(Text 40..120)", textType(integerType(40, 120)));
  expectTypeParse("(Ascii 40..120)", textType(integerType(40, 120), true));
  expectTypeParse("(Array Text 5)", arrayType(textType(), 5));
  expectTypeParse("(List Text)", listType(textType()));
  expectTypeParse("(List (List Text))", listType(listType(textType())));
  expectTypeParse("(List -999..999)", listType(integerType(-999, 999)));
});

describe("Parse statements", () => {
  testStmtParse(
    "comment",
    `%one\nprintln 58;%two\n%println -3;`,
    print(int(58n), true)
  );
  testStmtParse("infix assignment", "$x <- 5;", assignment(id("x"), int(5n)));
  testStmtParse(
    "if",
    "if $x (println $y);",
    ifStatement(id("x"), print(id("y"), true))
  );
  testStmtParse(
    "forRange",
    "for $x 1 20 1 (println $x);",
    forRange(id("x"), int(1n), int(20n), int(1n), print(id("x"), true))
  );
});

describe("Parse variants", () => {
  testStmtParse(
    "Two variants",
    `{ println $x; / print $x; print "\\n"; }`,
    variants([
      print(id("x"), true),
      block([print(id("x"), false), print(stringLiteral("\n"), false)]),
    ])
  );
  testStmtParse(
    "Three variants",
    `{ println $x; / print $x; print "\\n"; / print $x; print "\\n"; }`,
    variants([
      print(id("x"), true),
      block([print(id("x"), false), print(stringLiteral("\n"), false)]),
      block([print(id("x"), false), print(stringLiteral("\n"), false)]),
    ])
  );
  testStmtParse(
    "Expression variants",
    `println { 0 / 1 };`,
    print(variants([int(0n), int(1n)]), true)
  );
});

describe("Parse unambiguously", () => {
  testStmtParse(
    "Nested variants",
    `{
      {
        $a <- 0;
      }
    }`,
    variants([variants([assignment(id("a"), int(0n))])])
  );
});
