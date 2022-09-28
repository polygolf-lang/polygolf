import {
  binaryOp,
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
        binaryOp(
          "lt",
          binaryOp("mod", id("i"), {
            ...binaryOp(
              "sub",
              id("i"),
              binaryOp("mul", binaryOp("div", id("i"), int(10n)), int(9n))
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
