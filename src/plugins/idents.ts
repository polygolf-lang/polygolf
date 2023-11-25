import { type Plugin, type IdentifierGenerator } from "common/Language";
import { getDeclaredIdentifiers } from "../common/symbols";
import { type Spine } from "../common/Spine";
import {
  assignment,
  block,
  id,
  type Identifier,
  type IR,
  isUserIdent,
  type Node,
  type NodeFuncRecord,
  getNodeFunc,
  isText,
  builtin,
} from "../IR";

function getIdentMap(
  spine: Spine<IR.Node>,
  identGen: IdentifierGenerator,
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
  identGen: IdentifierGenerator = defaultIdentGen,
): Plugin {
  return {
    name: "renameIdents(...)",
    visit(program, spine, context) {
      context.skipChildren();
      const identMap = getIdentMap(spine.root, identGen);
      return spine.withReplacer((node) => {
        if (isUserIdent()(node)) {
          const outputName = identMap.get(node.name);
          if (outputName === undefined) {
            throw new Error(
              `Programming error. Incomplete identMap. Defined: ${JSON.stringify(
                [...identMap.keys()],
              )}, missing ${JSON.stringify(node.name)}`,
            );
          }
          return id(outputName);
        }
      }).node;
    },
  };
}

const defaultIdentGen: IdentifierGenerator = {
  preferred(original: string) {
    const firstLetter = [...original].find((x) => /[A-Za-z]/.test(x));
    if (firstLetter === undefined) return [];
    const lower = firstLetter.toLowerCase();
    const upper = firstLetter.toUpperCase();
    return [firstLetter, firstLetter === lower ? upper : lower];
  },
  short: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  general: (i) => `v${i}`,
};

/**
 * Aliases repeated expressions by mapping them to new variables.
 * @param getKey Calculates a key to compare expressions, `undefined` marks aliasing should not happen.
 * @param save `[cost of referring to the alias, cost of storing the alias]` or a custom byte save function.
 */
export function alias(
  getKeyRecord: NodeFuncRecord<string | undefined>,
  save: ((key: string, freq: number) => number) | [number, number] = [1, 3],
): Plugin {
  const getKey = getNodeFunc(getKeyRecord);
  const aliasingSave =
    typeof save === "function"
      ? save
      : (key: string, freq: number) =>
          (key.length - save[0]) * (freq - 1) - save[0] - save[1];
  return {
    name: "alias(...)",
    visit(prog, spine, context) {
      context.skipChildren();
      // get frequency of expr
      const timesUsed = new Map<string, number>();
      for (const key of spine.compactMap(getKey)) {
        timesUsed.set(key, (timesUsed.get(key) ?? 0) + 1);
      }
      // apply
      const assignments: (IR.Assignment & { variable: Identifier })[] = [];
      const replacedDeep = spine.withReplacer((node) => {
        const key = getKey(node, spine);
        if (key !== undefined && aliasingSave(key, timesUsed.get(key)!) > 0) {
          const alias = id(key + "+alias");
          if (assignments.every((x) => x.variable.name !== alias.name))
            assignments.push(assignment(alias, node));
          return alias;
        }
      }, false).node;
      return block([...assignments, replacedDeep]);
    },
  };
}

export function useBuiltinAliases(builtins: Record<string, string>) {
  return function (node: Node) {
    if (isText()(node) && node.value in builtins) {
      return builtin(builtins[node.value]);
    }
  };
}
