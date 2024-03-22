import {
  type Identifier,
  type IR,
  isIdent,
  isOp,
  isSubtype,
  type Node,
  type Op,
  textType,
  type Type,
  toString,
} from "../IR";
import { InvariantError, UserError } from "./errors";
import { $, getChildFragments, type PathFragment } from "./fragments";
import { getCollectionTypes, getType } from "./getType";
import { programToSpine, type Spine } from "./Spine";

/** Map from a name to the node that defines/binds it. */
class SymbolTable extends Map<string, Spine> {
  getRequired(key: string) {
    const ret = this.get(key);
    if (ret === undefined)
      throw new UserError(
        `Symbol not found: ${key}. ` +
          `Defined symbols: ${[...this.keys()].join(", ")}`,
        undefined,
      );
    return ret;
  }
}

const symbolTableCache = new WeakMap<IR.Node, SymbolTable>();
/** Get the symbol table for a program.
 *
 * Caching is done based on the program only: the function accumulates
 * symbols using a visitor, so performance can potentially be improved by
 * recursively merging symbol tables to avoid needing to re-traverse the whole
 * tree for every small change. */
export function symbolTableRoot(program: IR.Node): SymbolTable {
  if (symbolTableCache.has(program)) return symbolTableCache.get(program)!;
  const existing = new Set<string>();
  const defs = [
    ...programToSpine(program).compactMap((_, s) =>
      introducedSymbols(s, existing)?.map((name) => {
        existing.add(name);
        return [name, s] as const;
      }),
    ),
  ].flat(1);
  const table = new SymbolTable(defs);
  // check for duplicate real quick
  if (table.size < defs.length) {
    const sortedNames = defs.map(([name]) => name).sort();
    const duplicate = sortedNames.find(
      (name, i) => i > 0 && sortedNames[i - 1] === name,
    );
    if (duplicate !== undefined)
      throw new InvariantError(`Duplicate symbol: ${duplicate}`);
  }
  symbolTableCache.set(program, table);
  return table;
}

export function getDeclaredIdentifiers(program: IR.Node) {
  return symbolTableRoot(program).keys();
}

export function getIdentifierType(expr: IR.Identifier, program: IR.Node): Type {
  return getTypeFromBinding(
    expr.name,
    symbolTableRoot(program).getRequired(expr.name),
  );
}

export function isIdentifierReadonly(
  expr: IR.Identifier,
  program: IR.Node,
): boolean {
  if (expr.builtin) return true;
  const definingNode = symbolTableRoot(program).get(expr.name);
  return definingNode !== undefined && definingNode.node.kind !== "Assignment";
}

function introducedSymbols(
  spine: Spine,
  existing: Set<string>,
): string[] | undefined {
  const node = spine.node;
  switch (node.kind) {
    case "ForEach":
    case "ForArgv":
      return node.variable === undefined ? [] : [node.variable.name];
    case "Assignment":
      if (
        isIdent()(node.variable) &&
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
        .filter(isIdent())
        .filter((x) => !existing.has(x.name))
        .map((x) => x.name);
  }
}

function getTypeFromBinding(name: string, spine: Spine): Type {
  const node = spine.node;
  const program = spine.root.node;
  switch (node.kind) {
    case "ForEach":
      return getCollectionTypes(node.collection, program)[0];
    case "ForArgv":
      return textType();
    case "Assignment": {
      const assignedType = getType(node.expr, program);
      if (
        node.variable.type !== undefined &&
        !isSubtype(assignedType, node.variable.type)
      )
        throw new UserError(
          `Value of type ${toString(assignedType)} cannot be assigned to ${
            (node.variable as Identifier).name
          } of type ${toString(node.variable.type)}`,
          node,
        );
      return node.variable.type ?? assignedType;
    }
    default:
      throw new InvariantError(
        `Node of type ${node.kind} does not bind any symbol`,
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
  variable?: string,
): Spine<Identifier>[] {
  return getDirectReadFragments(spine.node)
    .map((x) => spine.getChild(x))
    .filter(
      (x) =>
        x !== undefined &&
        x.node.kind === "Identifier" &&
        !x.node.builtin &&
        (variable === undefined || variable === x.node.name),
    ) as Spine<Identifier>[];
}

export function getWrites(
  spine: Spine,
  variable?: string,
): Spine<Identifier>[] {
  return [...spine.compactMap((n, s) => getDirectWrites(s, variable))].flat();
}

export function getDirectWrites(
  spine: Spine,
  variable?: string,
): Spine<Identifier>[] {
  return getDirectWriteFragments(spine.node)
    .map((x) => spine.getChild(x))
    .filter(
      (x) =>
        x !== undefined &&
        x.node.kind === "Identifier" &&
        !x.node.builtin &&
        (variable === undefined || variable === x.node.name),
    ) as Spine<Identifier>[];
}

function getDirectReadFragments(node: Node): PathFragment[] {
  switch (node.kind) {
    case "Assignment":
      return [$.expr];
    case "ForArgv":
      return [$.body];
    case "ForCLike":
      return [$.condition];
    case "ForEach":
      return [$.collection];
    case "If":
      return [$.condition];
    case "ManyToManyAssignment":
      return node.exprs.map((x, i) => $.exprs.at(i));
    case "OneToManyAssignment":
      return [$.expr];
    case "Op":
      return getDirectPolygolfReadFragments(node).map((i) => $.args.at(i));
    case "VarDeclaration":
      return [];
    case "VarDeclarationBlock":
      return [];
    case "While":
      return [$.condition];
  }
  return [...getChildFragments(node)];
}

function getDirectPolygolfReadFragments(node: Op): number[] {
  // switch (node.op) {
  // }
  return node.args.map((x, i) => i);
}

function getDirectWriteFragments(node: Node): PathFragment[] {
  switch (node.kind) {
    case "Assignment":
      return [$.variable];
    case "ManyToManyAssignment":
    case "OneToManyAssignment":
      return node.variables.map((x, i) => $.variables.at(i));
  }
  return [];
}

export function hasSideEffect(spine: Spine): boolean {
  return spine.someNode(hasDirectSideEffect);
}

export function hasDirectSideEffect(node: Node, spine: Spine) {
  try {
    return (
      isOp("read[byte]", "read[codepoint]", "read[line]", "read[Int]")(node) ||
      getType(node, spine).kind === "void"
    );
  } catch {
    return false;
  }
}

export function readsFromStdin(node: Node): boolean {
  return isOp("read[byte]", "read[codepoint]", "read[line]", "read[Int]")(node);
}

export function readsFromArgv(node: Node): boolean {
  return node.kind === "ForArgv" || isOp("argv")(node);
}

export function readsFromInput(node: Node): boolean {
  return readsFromArgv(node) || readsFromStdin(node);
}
