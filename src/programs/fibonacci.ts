import {
  assignment,
  binaryOp,
  block,
  id,
  int,
  mutatingBinaryOp,
  program,
  print,
  variants,
  varDeclaration,
  forRangeCommon,
  integerType,
} from "../IR";

export default program(
  block([
    varDeclaration("a", integerType(0, 1346269)),
    varDeclaration("b", integerType(0, 1346269)),
    assignment("a", int(0n)),
    assignment("b", int(1n)),
    forRangeCommon(
      ["i", 0, 31],
      print(id("a"), true),
      variants([
        block([
          varDeclaration("t", integerType(0, 1346269)),
          assignment("t", binaryOp("add", id("a"), id("b"))),
          assignment("a", id("b")),
          assignment("b", id("t")),
        ]),
        block([
          mutatingBinaryOp("add", id("b"), id("a")),
          assignment("a", binaryOp("sub", id("b"), id("a"))),
        ]),
      ])
    ),
  ])
);
