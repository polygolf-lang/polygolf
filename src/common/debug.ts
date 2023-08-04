import parse from "../frontend/parse";
import { Program } from "../IR";
import polygolfLanguage from "../languages/polygolf";
import applyLanguage, { compilationOptions } from "./compile";

export default function debug(program: Program) {
  console.log(
    applyLanguage(
      polygolfLanguage,
      program,
      compilationOptions("none", "bytes")
    )
  );
}

export function normalize(source: string) {
  try {
    return applyLanguage(
      polygolfLanguage,
      parse(source, false),
      compilationOptions("none", "bytes"),
      true
    );
  } catch {
    return source;
  }
}
