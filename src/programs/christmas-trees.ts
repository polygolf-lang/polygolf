import {
  binaryOp,
  block,
  id,
  int,
  program,
  print,
  stringLiteral,
  forRangeCommon,
} from "../IR";

export default program(
  block([
    forRangeCommon(
      ["i", 3, 10],
      forRangeCommon(
        ["j", 0, id("i")],
        print(
          binaryOp(
            "str_concat",
            binaryOp(
              "repeat",
              stringLiteral(" "),
              binaryOp("sub", id("i"), id("j"))
            ),
            binaryOp(
              "repeat",
              stringLiteral("*"),
              binaryOp("add", binaryOp("mul", int(2n), id("j")), int(1n))
            )
          )
        )
      ),
      print(
        binaryOp(
          "str_concat",
          binaryOp("repeat", stringLiteral(" "), id("i")),
          stringLiteral("*\n")
        )
      )
    ),
  ])
);
