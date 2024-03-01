import { stringify } from "../common/stringify";
import {
  assignment,
  id,
  int,
  text,
  print,
  list,
  functionCall,
  op,
  block,
  ifStatement,
  integerType,
  variants,
  annotate,
  listType,
  arrayType,
  type Node,
  textType,
  booleanType,
  type Type,
  lengthToArrayIndexType,
  forEach,
} from "../IR";
import parse from "./parse";

function testStmtParse(desc: string, str: string, output: Node) {
  test(desc, () => {
    expect(stringify(parse(str, false).node)).toEqual(stringify(output));
  });
}

function expectExprParse(desc: string, str: string, output: Node) {
  testStmtParse(desc, `assign $x ${str};`, assignment("x", output));
}

function expectTypeParse(type: string, output: Type) {
  expectExprParse(type, "$a:" + type, annotate(id("a"), output));
}

describe("Parse literals", () => {
  expectExprParse("single digit", "5", int(5));
  expectExprParse("negative integer", "-123", int(-123));
  expectExprParse("scientific notation", "1e6", int(1000000));
  expectExprParse("binary literal", "-0b100110", int(-0b100110));
  expectExprParse("hexadecimal literal", "-0xabcdef", int(-0xabcdef));
  expectExprParse("variable", "$y", id("y"));
  expectExprParse("string literal", '"abc"', text("abc"));
  expectExprParse("string with escapes", '"\\u0001\\r"', text("\u0001\r"));
});

describe("Parse s-expressions", () => {
  expectExprParse("true nullary op", "true", op.true);
  expectExprParse("argv nullary op", "argv", op.argv);
  expectExprParse(
    "user function",
    "($f 1 2)",
    functionCall(id("f"), int(1n), int(2n)),
  );
  expectExprParse(
    "user function on variables",
    "($f $x $y)",
    functionCall(id("f"), id("x"), id("y")),
  );
  expectExprParse("add", "(add $x $y)", op.add(id("x"), id("y")));
  expectExprParse("mul infix", "($x * $y)", op.mul(id("x"), id("y")));
  expectExprParse("mod infix", "($x mod $y)", op.mod(id("x"), id("y")));
  expectExprParse("or", "(or $x $y)", op.or(id("x"), id("y")));
  expectExprParse("println[Text]", "(println[Text] $x)", print(id("x"), true));
  expectExprParse("print[Text]", "(print[Text] $x)", print(id("x"), false));
  expectExprParse("assign", "(assign $x 5)", assignment(id("x"), int(5n)));
  expectExprParse("assign infix", "($x <- 5)", assignment(id("x"), int(5n)));
  expectExprParse("list", "(list 1 2 3)", list([int(1n), int(2n), int(3n)]));
  expectExprParse(
    "+",
    "(add $x $y $z $w)",
    op.add(id("x"), id("y"), id("z"), id("w")),
  );
  expectExprParse(
    "..",
    "(concat[Text] $x $y $z)",
    op["concat[Text]"](id("x"), id("y"), id("z")),
  );
  expectExprParse("- as neg", "(- $x)", op.neg(id("x")));
  expectExprParse("- as sub", "(- $x $y)", op.sub(id("x"), id("y")));
  expectExprParse("~ as bitnot", "(~ $x)", op.bit_not(id("x")));
  expectExprParse("~ as bitxor", "(~ $x $y)", op.bit_xor(id("x"), id("y")));
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
  expectTypeParse(
    "(Array Text 5)",
    arrayType(textType(), lengthToArrayIndexType(5)),
  );
  expectTypeParse("(List Text)", listType(textType()));
  expectTypeParse("(List (List Text))", listType(listType(textType())));
  expectTypeParse("(List -999..999)", listType(integerType(-999, 999)));
});

describe("Parse statements", () => {
  testStmtParse(
    "comment",
    `%one\nprintln[Text] 58;%two\n%println[Text] -3;`,
    print(int(58n), true),
  );
  testStmtParse("infix assignment", "$x <- 5;", assignment(id("x"), int(5n)));
  testStmtParse(
    "if",
    "if $x (println[Text] $y);",
    ifStatement(id("x"), print(id("y"), true)),
  );
  testStmtParse(
    "for",
    "for $x $list (println[Text] $x);",
    forEach(id("x"), id("list"), print(id("x"))),
  );
});

describe("Parse variants", () => {
  testStmtParse(
    "Two variants",
    `{ println[Text] $x; / print[Text] $x; print[Text] "\\n"; }`,
    variants([
      print(id("x"), true),
      block([print(id("x"), false), print(text("\n"), false)]),
    ]),
  );
  testStmtParse(
    "Three variants",
    `{ println[Text] $x; / print[Text] $x; print[Text] "\\n"; / print[Text] $x; print[Text] "\\n"; }`,
    variants([
      print(id("x"), true),
      block([print(id("x"), false), print(text("\n"), false)]),
      block([print(id("x"), false), print(text("\n"), false)]),
    ]),
  );
  testStmtParse(
    "Node variants",
    `println[Text] { 0 / 1 };`,
    print(variants([int(0n), int(1n)]), true),
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
    variants([variants([assignment(id("a"), int(0n))])]),
  );
});
