import { Plugin, IdentifierGenerator } from "common/Language";
import { getDeclaredIdentifiers } from "../common/symbols";
import { Spine } from "../common/Spine";
import { assignment, block, copyType, id, Identifier, IR } from "../IR";

function getIdentMap(
  spine: Spine<IR.Program>,
  identGen: IdentifierGenerator
): Map<string, string> {
  // First, try mapping as many idents as possible to their preferred versions
  const inputNames = [...getDeclaredIdentifiers(spine.node)];
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

export function renameIdents(
  identGen: IdentifierGenerator = defaultIdentGen
): Plugin {
  return {
    name: "renameIdents(...)",
    visit(program, spine) {
      if (program.kind !== "Program") return;
      const identMap = getIdentMap(spine.root, identGen);
      return spine.withReplacer((node) => {
        if (node.kind === "Identifier" && !node.builtin) {
          const outputName = identMap.get(node.name);
          if (outputName === undefined)
            throw new Error("Programming error. Incomplete identMap.");
          return copyType(node, id(outputName));
        }
      }).node;
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

function defaultShouldAlias(name: string, freq: number): boolean {
  return 3 + name.length + freq < name.length * freq;
}
export function aliasBuiltins(
  shouldAlias: (name: string, freq: number) => boolean = defaultShouldAlias
): Plugin {
  return {
    name: "aliasBuiltins(...)",
    visit(program, spine) {
      if (program.kind !== "Program") return;
      // get frequency of each builtin
      const timesUsed = new Map<string, number>();
      for (const name of spine.compactMap((node) => {
        if (node.kind === "Identifier" && node.builtin) return node.name;
      })) {
        const freq = timesUsed.get(name) ?? 0;
        timesUsed.set(name, freq + 1);
      }
      // apply
      const assignments: (IR.Assignment & { variable: Identifier })[] = [];
      const replacedDeep = spine.withReplacer((node) => {
        if (
          node.kind === "Identifier" &&
          node.builtin &&
          shouldAlias(node.name, timesUsed.get(node.name)!)
        ) {
          const alias = node.name + "_alias";
          if (assignments.every((x) => x.variable.name !== alias))
            assignments.push(assignment(alias, id(node.name, true)));
          return { ...node, builtin: false, name: alias };
        }
      }).node as IR.Program;
      return {
        ...replacedDeep,
        body: block([
          ...assignments,
          ...(program.body.kind === "Block"
            ? program.body.children
            : [program.body]),
        ]),
      };
    },
  };
}
