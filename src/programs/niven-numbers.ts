import {
  polygolfOp,
  block,
  id,
  int,
  program,
  print,
  ifStatement,
  forRangeCommon,
  integerType,
} from "../IR";

export default program(
  block([
    forRangeCommon(
      ["i", 1, 101],
      ifStatement(
        polygolfOp(
          "lt",
          polygolfOp("mod", id("i"), {
            ...polygolfOp(
              "sub",
              id("i"),
              polygolfOp("mul", polygolfOp("div", id("i"), int(10n)), int(9n))
            ),
            valueType: integerType(0n, 100n),
          }),
          int(1n)
        ),
        block([print(id("i"), true)])
      )
    ),
  ])
);
