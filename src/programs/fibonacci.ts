import {
  assignment,
  binaryOp,
  block,
  forRange,
  id,
  int,
  mutatingBinaryOp,
  program,
  print,
  variants,
  varDeclaration,
  simpleType,
} from "../IR";

export default program(
  block([
    varDeclaration("a", simpleType("number")),
    varDeclaration("b", simpleType("number")),
    assignment("a", int(0n)),
    assignment("b", int(1n)),
    forRange(
      "i",
      int(0n),
      int(30n),
      int(1n),
      block([
        print(id("a"), true),
        variants([
          block([
            varDeclaration("t", simpleType("number")),
            assignment("t", binaryOp("add", id("a"), id("b"))),
            assignment("b", id("a")),
            assignment("a", id("t")),
            mutatingBinaryOp("add", id("i"), int(1n)),
          ]),
          block([
            mutatingBinaryOp("add", id("b"), id("a")),
            assignment("a", binaryOp("sub", id("b"), id("a"))),
          ]),
        ]),
      ]),
      true
    ),
  ])
);
