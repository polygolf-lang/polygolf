import {
  polygolfOp,
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
        polygolfOp(
          "or",
          polygolfOp("gt", polygolfOp("mod", id("y"), int(25n)), int(0n)),
          polygolfOp("lt", polygolfOp("mod", id("y"), int(100n)), int(1n))
        ),
        block([print(polygolfOp("mul", int(4n), id("y")))])
      )
    ),
  ])
);
