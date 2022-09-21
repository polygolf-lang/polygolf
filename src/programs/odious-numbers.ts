import {
  block,
  id,
  program,
  print,
  stringLiteral,
  varDeclaration,
  simpleType,
  assignment,
  stringGetByte,
  forRangeCommon,
} from "../IR";

export default program(
  block([
    varDeclaration("e", simpleType("string")),
    assignment("e", stringLiteral("\r #%&)*,/12")),
    forRangeCommon(["i", 0, 27], print(stringGetByte(id("e"), id("i")))),
  ])
);
