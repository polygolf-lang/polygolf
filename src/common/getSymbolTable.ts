import { integerType, IR, sub, Type } from "../IR";
import { PolygolfError } from "./errors";
import { getCollectionTypes, getType } from "./getType";
import { programToSpine, Spine } from "./Spine";

class SymbolTable extends Map<string, Type> {
  getRequired(key: string) {
    const ret = this.get(key);
    if (ret === undefined) throw new Error(`Symbol not found: ${key}`);
    return ret;
  }
}

const symbolTableCache = new WeakMap<IR.Program, SymbolTable>();
/** Get the symbol table for a program.
 *
 * Caching is done based on the program only: the function accumulates
 * symbols using a visitor, so performance can potentially be improved by
 * recursively merging symbol tables to avoid needing to re-traverse the whole
 * tree for every small change. */
export function symbolTableRoot(program: IR.Program): SymbolTable {
  if (symbolTableCache.has(program)) return symbolTableCache.get(program)!;
  const defs = [...programToSpine(program).visit(introducedSymbols)].flat(1);
  const table = new SymbolTable(defs);
  // checks for a duplicate by seeing if the value in the table is different
  // than the value expected.
  // Assumes that annotating a variable twice with the same value is OK.
  const duplicate = defs.find(([name, type]) => table.get(name) !== type);
  if (duplicate !== undefined)
    throw new Error(`Duplicate symbol: ${duplicate[0]}`);
  symbolTableCache.set(program, table);
  return table;
}

function introducedSymbols(spine: Spine): [string, Type][] | undefined {
  const node = spine.node;
  const program = spine.root.node;
  switch (node.kind) {
    case "ForRange": {
      const low = getType(node.low, program);
      const high = getType(node.high, program);
      const step = getType(node.increment, program);
      if (
        low.kind !== "integer" ||
        high.kind !== "integer" ||
        step.kind !== "integer"
      ) {
        throw new PolygolfError(
          `Unexpected for range type (${low.kind},${high.kind},${step.kind})`,
          node.source
        );
      }
      const t = integerType(low.low, sub(high.high, node.inclusive ? 0n : 1n));
      return [[node.variable.name, t]];
    }
    case "ForEach": {
      const t = getCollectionTypes(node.collection, program)[0];
      return [[node.variable.name, t]];
    }
    case "ForEachKey": {
      const t = getCollectionTypes(node.table, program)[0];
      return [[node.variable.name, t]];
    }
    case "ForEachPair": {
      const _types = getCollectionTypes(node.table, program);
      const types = _types.length === 1 ? [integerType(), _types[0]] : _types;
      return [
        [node.keyVariable.name, types[0]],
        [node.valueVariable.name, types[1]],
      ];
    }
    case "Assignment": {
      if (
        node.variable.kind === "Identifier" &&
        // treat every user-annotated assignment as a declaration
        node.variable.type !== undefined
      ) {
        return [[node.variable.name, node.variable.type]];
      }
    }
  }
}
