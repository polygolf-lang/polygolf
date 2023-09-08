import {
  add,
  Identifier,
  integerType,
  integerTypeIncludingAll,
  IR,
  isPolygolfOp,
  isSubtype,
  lt,
  Node,
  PolygolfOp,
  sub,
  textType,
  Type,
} from "../IR";
import { PolygolfError } from "./errors";
import { getChildFragments, PathFragment } from "./fragments";
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

export function isIdentifierReadonly(
  expr: IR.Identifier,
  program: IR.Program
): boolean {
  if (expr.builtin) return true;
  const definingNode = symbolTableRoot(program).get(expr.name);
  return definingNode !== undefined && definingNode.node.kind !== "Assignment";
}

function introducedSymbols(
  spine: Spine,
  existing: Set<string>
): string[] | undefined {
  const node = spine.node;
  switch (node.kind) {
    case "ForRange":
    case "ForDifferenceRange":
    case "ForEach":
    case "ForEachKey":
    case "ForArgv":
      return node.variable === undefined ? [] : [node.variable.name];
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
    case "OneToManyAssignment":
    case "ManyToManyAssignment":
      return node.variables
        .filter((x) => x.kind === "Identifier" && !existing.has(x.name))
        .map((x) => (x as any).name);
  }
}

function getTypeFromBinding(name: string, spine: Spine): Type {
  const node = spine.node;
  const program = spine.root.node;
  switch (node.kind) {
    case "ForRange":
    case "ForDifferenceRange": {
      const start = getType(node.start, program);
      let end = getType(
        node.kind === "ForRange" ? node.end : node.difference,
        program
      );
      const step = getType(node.increment, program);
      if (
        start.kind !== "integer" ||
        end.kind !== "integer" ||
        step.kind !== "integer"
      ) {
        throw new PolygolfError(
          `Unexpected for range type (${start.kind},${end.kind},${step.kind})`,
          node.source
        );
      }
      if (node.kind === "ForDifferenceRange")
        end = integerType(add(start.low, end.low), add(start.high, end.high)); // get the real end
      if (lt(0n, step.low))
        return integerType(
          start.low,
          node.inclusive ? end.high : sub(end.high, 1n)
        );
      if (lt(step.high, 0n))
        return integerType(
          node.inclusive ? end.low : add(end.low, 1n),
          start.high
        );
      return integerTypeIncludingAll(start.low, start.high, end.low, end.high);
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

export interface VarAccess {
  spine: Spine<Identifier>;
  isRead: boolean;
  isWrite: boolean;
  order: number;
}

export function getReads(spine: Spine, variable?: string): Spine<Identifier>[] {
  return [...spine.compactMap((n, s) => getDirectReads(s, variable))].flat();
}

export function getDirectReads(
  spine: Spine,
  variable?: string
): Spine<Identifier>[] {
  return getDirectReadFragments(spine.node)
    .map((x) => spine.getChild(x))
    .filter(
      (x) =>
        x !== undefined &&
        x.node.kind === "Identifier" &&
        !x.node.builtin &&
        (variable === undefined || variable === x.node.name)
    ) as Spine<Identifier>[];
}

export function getWrites(
  spine: Spine,
  variable?: string
): Spine<Identifier>[] {
  return [...spine.compactMap((n, s) => getDirectWrites(s, variable))].flat();
}

export function getDirectWrites(
  spine: Spine,
  variable?: string
): Spine<Identifier>[] {
  return getDirectWriteFragments(spine.node)
    .map((x) => spine.getChild(x))
    .filter(
      (x) =>
        x !== undefined &&
        x.node.kind === "Identifier" &&
        !x.node.builtin &&
        (variable === undefined || variable === x.node.name)
    ) as Spine<Identifier>[];
}

function getDirectReadFragments(node: Node): PathFragment[] {
  switch (node.kind) {
    case "Assignment":
      return ["expr"];
    case "ForArgv":
      return ["body"];
    case "ForCLike":
      return ["condition"];
    case "ForDifferenceRange":
      return ["start", "difference", "increment"];
    case "ForEach":
      return ["collection"];
    case "ForEachPair":
      return ["table"];
    case "ForRange":
      return ["start", "end", "increment"];
    case "IfStatement":
      return ["condition"];
    case "ManyToManyAssignment":
      return node.exprs.map((x, index) => ({ prop: "exprs", index }));
    case "OneToManyAssignment":
      return ["expr"];
    case "PolygolfOp":
      return getDirectPolygolfReadFragments(node).map((index) => ({
        prop: "args",
        index,
      }));
    case "VarDeclaration":
      return [];
    case "VarDeclarationBlock":
      return [];
    case "WhileLoop":
      return ["condition"];
  }
  return [...getChildFragments(node)];
}

function getDirectPolygolfReadFragments(node: PolygolfOp): number[] {
  // switch (node.op) {
  // }
  return node.args.map((x, i) => i);
}

function getDirectWriteFragments(node: Node): PathFragment[] {
  switch (node.kind) {
    case "Assignment":
      return ["variable"];
    case "ManyToManyAssignment":
    case "OneToManyAssignment":
      return node.variables.map((x, index) => ({ prop: "variables", index }));
    case "PolygolfOp":
      return getDirectPolygolfWriteFragments(node).map((index) => ({
        prop: "args",
        index,
      }));
  }
  return [];
}

function getDirectPolygolfWriteFragments(node: PolygolfOp): number[] {
  switch (node.op) {
    case "array_set":
    case "list_set":
    case "table_set":
      return [0];
  }
  return [];
}

export function hasSideEffect(spine: Spine): boolean {
  return spine.someNode(hasDirectSideEffect);
}

export function hasDirectSideEffect(node: Node, spine: Spine) {
  try {
    return (
      isPolygolfOp(
        node,
        "read_byte",
        "read_codepoint",
        "read_line",
        "read_int"
      ) ||
      (node.kind !== "Program" && getType(node, spine).kind === "void")
    );
  } catch {
    return false;
  }
}

export function readsFromStdin(node: Node): boolean {
  return isPolygolfOp(
    node,
    "read_byte",
    "read_codepoint",
    "read_line",
    "read_int"
  );
}

export function readsFromArgv(node: Node): boolean {
  return node.kind === "ForArgv" || isPolygolfOp(node, "argv", "argv_get");
}

export function readsFromInput(node: Node): boolean {
  return readsFromArgv(node) || readsFromStdin(node);
}
