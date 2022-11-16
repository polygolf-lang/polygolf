import { IR, typesPass } from "../IR";
import { expandVariants } from "./expandVariants";
import { programToPath } from "./traverse";
import { Language, defaultDetokenizer } from "./Language";

export default function applyLanguage(
  language: Language,
  program: IR.Program,
  maxBranches: number = 1000,
  skipTypesPass: boolean = false
): string {
  return applyLanguages([language], program, maxBranches, skipTypesPass)[0];
}

export function applyLanguages(
  languages: Language[],
  program: IR.Program,
  maxBranches: number = 1000,
  skipTypesPass: boolean = false
): string[] {
  const variants = expandVariants(program);
  if (!skipTypesPass)
    for (const variant of variants) {
      typesPass(variant);
    }
  return languages.map((x) =>
    applyLanguageToVariants(
      x,
      structuredClone(x.name === "Polygolf" ? [program] : variants),
      maxBranches
    )
  );
}

export function applyLanguageToVariants(
  language: Language,
  variants: IR.Program[],
  maxBranches: number = 1000
): string {
  let emittedVariants: [IR.Program, string][] = emitVariants(
    language,
    -1,
    variants,
    maxBranches
  );
  const variantsPluginsIndices = [...language.plugins.keys()].filter(
    (i) => language.plugins[i].generatesVariants === true
  );
  let lastAppliedPluginIndex = -1;
  for (const vpi of variantsPluginsIndices) {
    for (let i = lastAppliedPluginIndex + 1; i < vpi; i++) {
      emittedVariants.forEach((v) => {
        const path = programToPath(v[0]);
        path.visit(language.plugins[i]);
      });
    }
    const newVariants: IR.Program[] = [];
    for (const variant of emittedVariants) {
      const path = programToPath(variant[0]);
      path.visit(language.plugins[vpi]);
      for (const newVariant of expandVariants(variant[0])) {
        newVariants.push(newVariant);
      }
    }
    lastAppliedPluginIndex = vpi;
    emittedVariants = emitVariants(language, vpi, newVariants, maxBranches);
  }
  return emittedVariants[0][1];
}

function emitVariants(
  language: Language,
  lastAppliedPluginIndex: number,
  variants: IR.Program[],
  maxBranches: number
): [IR.Program, string][] {
  const result: [IR.Program, string][] = [];
  let remaining = variants.length;
  for (const variant of variants) {
    remaining--;
    const variantClone = structuredClone(variant);
    const path = programToPath(variantClone);
    for (let i = lastAppliedPluginIndex + 1; i < language.plugins.length; i++) {
      if (language.plugins[i].generatesVariants === true) continue;
      path.visit(language.plugins[i]);
    }
    try {
      result.push([
        variant,
        (language.detokenizer ?? defaultDetokenizer())(
          language.emitter(variantClone)
        ),
      ]);
    } catch (e) {
      if (remaining + result.length < 1) {
        throw e;
      }
    }
  }
  result.sort((a, b) => a[1].length - b[1].length);
  return result.slice(0, maxBranches);
}
