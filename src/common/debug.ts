import parse from "@/frontend/parse";
import { Program } from "../IR";
import polygolfLanguage from "../languages/polygolf";
import applyLanguage, { searchOptions } from "./applyLanguage";

export default function debug(program: Program) {
  console.log(
    applyLanguage(polygolfLanguage, program, searchOptions("none", "bytes"))
  );
}

export function normalize(source: string) {
  try {
    return applyLanguage(
      polygolfLanguage,
      parse(source, false),
      searchOptions("none", "bytes"),
      true
    );
  } catch {
    return source;
  }
}
