import { Program } from "../IR";
import polygolfLanguage from "../languages/polygolf";
import applyLanguage from "./applyLanguage";

export default function debug(
  program: Program,
  stripTypes = false,
  skipTypesPass = true
) {
  console.log(
    applyLanguage(polygolfLanguage(stripTypes), program, skipTypesPass)
  );
}
