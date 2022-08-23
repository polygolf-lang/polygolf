import { stripVTControlCharacters } from "util";
import { IR, programToPath, Path } from "../IR";
import { expandVariants } from "../IR/expandVariants";
import { Language, IdentifierGenerator } from "./Language";

function applyLanguageToVariant(
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
  var identMap = getIdentMap(path, language.identGen);
  path.visit(nameIdents(identMap));
  return language.emitter(program);
}

function getIdentMap(
  path: Path<IR.Program>,
  identGen: IdentifierGenerator
): Map<string, string> {
  //first, try mapping as many idents as possible to their preffered versions
  var inputNames = path.getUsedIdentifiers();
  var outputNames = new Set<string>();
  var result = new Map<string, string>();
  for (let iv of inputNames) {
    for (let preferred of identGen.preferred(iv)) {
      if (!outputNames.has(preferred)) {
        outputNames.add(preferred);
        result.set(iv, preferred);
        break;
      }
    }
  }
  //then, try mapping those that remained unmapped to one of the short ident names
  var shortNames = identGen.short;
  for (let iv of inputNames) {
    if (!result.has(iv)) {
      for (let short in shortNames) {
        if (!outputNames.has(short)) {
          outputNames.add(short);
          result.set(iv, short);
          break;
        }
      }
    }
  }
  //finally, map all remaining idents to some general ident
  var i = 0;
  for (let iv of inputNames) {
    if (!result.has(iv)) {
      while (true) {
        let general = identGen.general(i++);
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
        var outputName = identMap.get(path.node.name);
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
  var result: string | null = null;
  var errors = new Map<string, number>();
  var mostCommonErrorCount = 0;
  var mostCommonError = "";
  programs.forEach((x) => {
    try {
      let compiled = applyLanguageToVariant(language, x);
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
