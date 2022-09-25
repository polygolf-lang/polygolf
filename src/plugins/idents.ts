import { IdentifierGenerator } from "common/Language";
import { Path } from "../common/traverse";
import { IR } from "../IR";

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

let identMap: Map<string, string>;
export function renameIdents(identGen: IdentifierGenerator = defaultIdentGen) {
  return {
    enter(path: Path) {
      if (path.node.type === "Program") {
        identMap = getIdentMap(path.root, identGen);
      }
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

const defaultIdentGen = {
  preferred(original: string) {
    const lower = original[0].toLowerCase();
    const upper = original[0].toUpperCase();
    return [original[0], original[0] === lower ? upper : lower];
  },
  short: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  general: (i: number) => "v" + i.toString(),
};
