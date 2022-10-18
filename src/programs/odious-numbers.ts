import {
  block,
  id,
  program,
  print,
  stringLiteral,
  varDeclaration,
  simpleType,
  assignment,
  forRangeCommon,
  polygolfOp,
} from "../IR";

export default program(
  block([
    varDeclaration("e", simpleType("string")),
    assignment("e", stringLiteral("\r #%&)*,/12")),
    forRangeCommon(
      ["i", 0, 27],
      print(polygolfOp("str_get_byte", id("e"), id("i")))
    ),
  ])
);
