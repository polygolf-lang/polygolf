import {
  binaryOp,
  block,
  forRange,
  id,
  int,
  program,
  print,
  ifStatement,
} from "../IR";

export default program(
  block([
    forRange(
      "y",
      int(450n),
      int(601n),
      int(1n),
      block([
        ifStatement(
          binaryOp(
            "or",
            binaryOp("gt", binaryOp("mod", id("y"), int(25n)), int(0n)),
            binaryOp("lt", binaryOp("mod", id("y"), int(100n)), int(1n))
          ),
          block([print(binaryOp("mul", int(4n), id("y")))])
        ),
      ])
    ),
  ])
);
