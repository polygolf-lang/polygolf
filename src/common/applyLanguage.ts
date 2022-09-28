import { IR } from "../IR";
import { expandVariants } from "./expandVariants";
import { programToPath } from "./traverse";
import { Language, defaultDetokenizer } from "./Language";

export function applyLanguageToVariant(
  language: Language,
  program: IR.Program
): string {
  const path = programToPath(program);
  // Apply each visitor sequentially, re-walking the tree for each one
  // A different option is to merge visitors together (like Babel) to apply
  // them simultaneously, but be careful to go in order between the plugins
  for (const visitor of language.plugins) {
    path.visit(visitor);
  }
  return (language.detokenizer ?? defaultDetokenizer())(
    language.emitter(program)
  );
}

export function applyLanguageToVariants(
  language: Language,
  programs: IR.Program[]
): string {
  if (programs.length === 1) {
    return applyLanguageToVariant(language, programs[0]);
  }
  let result: string | null = null;
  const errors = new Map<string, number>();
  let mostCommonErrorCount = 0;
  let mostCommonError = "";
  programs.forEach((x) => {
    try {
      const compiled = applyLanguageToVariant(language, x);
      if (result === null || result.length > compiled.length) {
        result = compiled;
      }
    } catch (err) {
      if (err instanceof Error) {
        errors.set(err.message, (errors.get(err.message) ?? 0) + 1);
        if (errors.get(err.message)! > mostCommonErrorCount) {
          mostCommonErrorCount++;
          mostCommonError = err.message;
        }
      }
    }
  });
  if (result !== null) return result;
  throw new Error(
    "No variant could be compiled. Most common error follows. " +
      mostCommonError
  );
}

export function applyLanguage(language: Language, program: IR.Program): string {
  return applyLanguageToVariants(language, expandVariants(program));
}
