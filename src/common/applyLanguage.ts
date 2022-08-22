import { IR } from "IR";
import { Language } from "./Language";

export function applyLanguage(language: Language, program: IR.Program): string {
  for (const plugin of language.plugins) {
    program = plugin(program);
  }
  return language.emitter(program);
}
