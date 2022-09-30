import {
  polygolfOp,
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
          polygolfOp(
            "str_concat",
            polygolfOp(
              "repeat",
              stringLiteral(" "),
              polygolfOp("sub", id("i"), id("j"))
            ),
            polygolfOp(
              "repeat",
              stringLiteral("*"),
              polygolfOp("add", polygolfOp("mul", int(2n), id("j")), int(1n))
            )
          )
        )
      ),
      print(
        polygolfOp(
          "str_concat",
          polygolfOp("repeat", stringLiteral(" "), id("i")),
          stringLiteral("*\n")
        )
      )
    ),
  ])
);
