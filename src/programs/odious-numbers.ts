import {
  block,
  forRange,
  id,
  int,
  program,
  print,
  stringLiteral,
  varDeclaration,
  simpleType,
  assignment,
  stringGetByte,
} from "../IR";

export default program(
  block([
    varDeclaration("e", simpleType("string")),
    assignment("e", stringLiteral("\r #%&)*,/12")),
    forRange(
      "i",
      int(0n),
      int(27n),
      int(1n),
      block([print(stringGetByte(id("e"), id("i")))])
    ),
  ])
);
