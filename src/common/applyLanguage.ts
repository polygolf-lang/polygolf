import { IR, programToPath } from "../IR";
import { Language } from "./Language";

export function applyLanguage(language: Language, program: IR.Program): string {
  const path = programToPath(program);
  // Apply each visitor sequentially, re-walking the tree for each one
  // A different option is to merge visitors together (like Babel) to apply
  // them simultaneously, but be careful to go in order between the plugins
  for (const visitor of language.plugins) {
    path.visit(visitor);
  }
  return language.emitter(program);
}
