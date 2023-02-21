import {
  Identifier,
  integerType,
  IR,
  isSubtype,
  sub,
  textType,
  Type,
} from "../IR";
import { PolygolfError } from "./errors";
import { getCollectionTypes, getType } from "./getType";
import { programToSpine, Spine } from "./Spine";

/** Map from a name to the node that defines/binds it. */
class SymbolTable extends Map<string, Spine> {
  getRequired(key: string) {
    const ret = this.get(key);
    if (ret === undefined)
      throw new Error(
        `Symbol not found: ${key}. ` +
          `Defined symbols: ${[...this.keys()].join(", ")}`
      );
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
function symbolTableRoot(program: IR.Program): SymbolTable {
  if (symbolTableCache.has(program)) return symbolTableCache.get(program)!;
  const existing = new Set<string>();
  const defs = [
    ...programToSpine(program).compactMap((_, s) =>
      introducedSymbols(s, existing)?.map((name) => {
        existing.add(name);
        return [name, s] as const;
      })
    ),
  ].flat(1);
  const table = new SymbolTable(defs);
  // check for duplicate real quick
  if (table.size < defs.length) {
    const sortedNames = defs.map(([name]) => name).sort();
    const duplicate = sortedNames.find(
      (name, i) => i > 0 && sortedNames[i - 1] === name
    );
    if (duplicate !== undefined)
      throw new Error(`Duplicate symbol: ${duplicate}`);
  }
  symbolTableCache.set(program, table);
  return table;
}

export function getDeclaredIdentifiers(program: IR.Program) {
  return symbolTableRoot(program).keys();
}

export function getIdentifierType(
  expr: IR.Identifier,
  program: IR.Program
): Type {
  return getTypeFromBinding(
    expr.name,
    symbolTableRoot(program).getRequired(expr.name)
  );
}

function introducedSymbols(
  spine: Spine,
  existing: Set<string>
): string[] | undefined {
  const node = spine.node;
  switch (node.kind) {
    case "ForRange":
    case "ForEach":
    case "ForEachKey":
    case "ForArgv":
      return [node.variable.name];
    case "ForEachPair":
      return [node.keyVariable.name, node.valueVariable.name];
    case "Assignment":
      if (
        node.variable.kind === "Identifier" &&
        // for backwards-compatibility, treat the first assignment of each
        // variable as a declaration. Otherwise we should:
        //    // treat every user-annotated assignment as a declaration
        //    node.variable.type !== undefined
        !existing.has(node.variable.name)
      )
        return [node.variable.name];
      break;
  }
}

function getTypeFromBinding(name: string, spine: Spine): Type {
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
      return integerType(low.low, sub(high.high, node.inclusive ? 0n : 1n));
    }
    case "ForEach":
      return getCollectionTypes(node.collection, program)[0];
    case "ForArgv":
      return textType();
    case "ForEachKey":
      return getCollectionTypes(node.table, program)[0];
    case "ForEachPair": {
      const _types = getCollectionTypes(node.table, program);
      const types = _types.length === 1 ? [integerType(), _types[0]] : _types;
      return name === node.keyVariable.name ? types[0] : types[1];
    }
    case "Assignment": {
      const assignedType = getType(node.expr, program);
      if (
        node.variable.type !== undefined &&
        !isSubtype(assignedType, node.variable.type)
      )
        throw new PolygolfError(
          `Value of type ${assignedType.kind} cannot be assigned to ${
            (node.variable as Identifier).name
          } of type ${node.variable.type.kind}`,
          node.source
        );
      return node.variable.type ?? assignedType;
    }
    default:
      throw new Error(
        `Programming error: node of type ${node.kind} does not bind any symbol`
      );
  }
}
