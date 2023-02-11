import { Program } from "../IR";
import polygolfLanguage from "../languages/polygolf";
import applyLanguage, { searchOptions } from "./applyLanguage";

export default function debug(program: Program) {
  console.log(
    applyLanguage(polygolfLanguage, program, searchOptions("none", "bytes"))
  );
}
