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
      "i",
      int(1n),
      int(101n),
      int(1n),
      block([
        ifStatement(
          binaryOp(
            "lt",
            binaryOp(
              "mod",
              id("i"),
              binaryOp(
                "sub",
                id("i"),
                binaryOp("mul", binaryOp("div", id("i"), int(10n)), int(9n))
              )
            ),
            int(1n)
          ),
          block([print(id("i"), true)])
        ),
      ])
    ),
  ])
);
