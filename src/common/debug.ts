import { Program } from "../IR";
import polygolfLanguage from "../languages/polygolf";
import applyLanguage from "./applyLanguage";

export default function debug(program: Program) {
  console.log(applyLanguage(polygolfLanguage, program));
}
