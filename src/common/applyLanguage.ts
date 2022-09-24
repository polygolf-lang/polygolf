import { Expr, IR, Program } from "../IR";
import { expandVariants } from "./expandVariants";
import { programToPath, Path } from "./traverse";
import {
  Language,
  IdentifierGenerator,
  OpTransformOutput,
  defaultDetokenizer,
  defaultIdentGen,
} from "./Language";
import { getType } from "./getType";

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
  const identMap = getIdentMap(path, language.identGen ?? defaultIdentGen);
  path.visit(nameIdents(identMap));
  return (language.detokenizer ?? defaultDetokenizer())(
    language.emitter(program)
  );
}

function getIdentMap(
  path: Path<IR.Program>,
  identGen: IdentifierGenerator
): Map<string, string> {
  // First, try mapping as many idents as possible to their preferred versions
  const inputNames = path.getUsedIdentifiers();
  const outputNames = new Set<string>();
  const result = new Map<string, string>();
  for (const iv of inputNames) {
    for (const preferred of identGen.preferred(iv)) {
      if (!outputNames.has(preferred)) {
        outputNames.add(preferred);
        result.set(iv, preferred);
        break;
      }
    }
  }
  // Then, try mapping those that remained unmapped to one of the short ident names
  const shortNames = identGen.short;
  for (const iv of inputNames) {
    if (!result.has(iv)) {
      for (const short of shortNames) {
        if (!outputNames.has(short)) {
          outputNames.add(short);
          result.set(iv, short);
          break;
        }
      }
    }
  }
  // Finally, map all remaining idents to some general ident
  let i = 0;
  for (const iv of inputNames) {
    if (!result.has(iv)) {
      while (true) {
        const general = identGen.general(i++);
        if (!outputNames.has(general)) {
          outputNames.add(general);
          result.set(iv, general);
          break;
        }
      }
    }
  }
  return result;
}

function nameIdents(identMap: Map<string, string>) {
  return {
    enter(path: Path) {
      if (path.node.type === "Identifier") {
        const outputName = identMap.get(path.node.name);
        if (outputName === undefined) {
          throw new Error("Programming error. Incomplete identMap.");
        }
        path.node.name = outputName;
      }
    },
  };
}

export function applyLanguageToVariants(
  language: Language,
  programs: IR.Program[]
): string {
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
    (programs.length > 1
      ? "No variant could be compiled. Most common error follows. "
      : "") + mostCommonError
  );
}

export function applyLanguage(language: Language, program: IR.Program): string {
  return applyLanguageToVariants(language, expandVariants(program));
}
