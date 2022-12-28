import { GolfPlugin, IdentifierGenerator } from "common/Language";
import { symbolTableRoot } from "../common/getSymbolTable";
import { Spine } from "../common/Spine";
import { assignment, block, id, Identifier, IR } from "../IR";

function getIdentMap(
  spine: Spine<IR.Program>,
  identGen: IdentifierGenerator
): Map<string, string> {
  // First, try mapping as many idents as possible to their preferred versions
  const inputNames = symbolTableRoot(spine.node).keys();
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
): GolfPlugin {
  return {
    tag: "golf",
    name: "renameIdents(...)",
    visit(spine: Spine) {
      if (spine.node.kind !== "Program") return;
      const identMap = getIdentMap(spine.root, identGen);
      return spine.withReplacer((s: Spine) => {
        if (s.node.kind === "Identifier" && !s.node.builtin) {
          const outputName = identMap.get(s.node.name);
          if (outputName === undefined)
            throw new Error("Programming error. Incomplete identMap.");
          return id(outputName);
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
): GolfPlugin {
  return {
    tag: "golf",
    name: "aliasBuiltins(...)",
    visit(spine: Spine) {
      const program = spine.node;
      if (program.kind !== "Program") return;
      // get frequency of each builtin
      const timesUsed = new Map<string, number>();
      spine.visit((s: Spine) => {
        const node = s.node;
        if (node.kind === "Identifier" && node.builtin) {
          const freq = timesUsed.get(node.name) ?? 0;
          timesUsed.set(node.name, freq + 1);
        }
      });
      // apply
      const assignments: (IR.Assignment & { variable: Identifier })[] = [];
      const replacedDeep = spine.withReplacer((s: Spine) => {
        const node = s.node;
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
