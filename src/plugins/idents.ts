import { Plugin, IdentifierGenerator } from "common/Language";
import { getDeclaredIdentifiers } from "../common/symbols";
import { Spine } from "../common/Spine";
import {
  assignment,
  block,
  Expr,
  id,
  Identifier,
  IR,
  Node,
  program,
} from "../IR";

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
          return id(outputName);
        }
      }).node;
    },
  };
}

const defaultIdentGen = {
  preferred(original: string) {
    if (original === "" || !/[A-Za-z]/.test(original[0])) return [];
    const lower = original[0].toLowerCase();
    const upper = original[0].toUpperCase();
    return [original[0], original[0] === lower ? upper : lower];
  },
  short: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  general: (i: number) => "v" + i.toString(),
};

export const aliasBuiltins: Plugin = alias((expr: Expr) =>
  expr.kind === "Identifier" && expr.builtin ? expr.name : undefined
);

export function alias(
  getExprKey: (expr: Expr) => string | undefined = (expr: Expr) => {
    switch (expr.kind) {
      case "Identifier":
        return expr.builtin ? expr.name : undefined;
      case "IntegerLiteral":
        return expr.value.toString();
      case "StringLiteral":
        return `"${expr.value}"`;
    }
  },
  aliasingSave: (key: string, freq: number) => number = (
    key: string,
    freq: number
  ) => (key.length - 1) * (freq - 1) - 4
): Plugin {
  const getKey = (node: Node) =>
    node.kind === "Program" ? undefined : getExprKey(node);
  return {
    name: "alias(...)",
    visit(prog, spine) {
      if (prog.kind !== "Program") return;
      // get frequency of expr
      const timesUsed = new Map<string, number>();
      for (const key of spine.compactMap(getKey)) {
        timesUsed.set(key, (timesUsed.get(key) ?? 0) + 1);
      }
      // apply
      const assignments: (IR.Assignment & { variable: Identifier })[] = [];
      const replacedDeep = spine.withReplacer((node) => {
        const key = getKey(node);
        if (key !== undefined && aliasingSave(key, timesUsed.get(key)!) > 0) {
          const alias = id(key + "POLYGOLFalias");
          if (assignments.every((x) => x.variable.name !== alias.name))
            assignments.push(assignment(alias, node as Expr));
          return alias;
        }
      }).node as IR.Program;
      return program(block([...assignments, replacedDeep.body]));
    },
  };
}
