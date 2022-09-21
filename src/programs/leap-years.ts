import {
  binaryOp,
  block,
  id,
  int,
  program,
  print,
  ifStatement,
  forRangeCommon,
} from "../IR";

export default program(
  block([
    forRangeCommon(
      ["y", 450, 601],
      ifStatement(
        binaryOp(
          "or",
          binaryOp("gt", binaryOp("mod", id("y"), int(25n)), int(0n)),
          binaryOp("lt", binaryOp("mod", id("y"), int(100n)), int(1n))
        ),
        block([print(binaryOp("mul", int(4n), id("y")))])
      )
    ),
  ])
);
