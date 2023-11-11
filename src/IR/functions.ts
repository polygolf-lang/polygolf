import {
  type Identifier,
  type BaseNode,
  type Node,
  type IDCastable,
  castID,
} from "./IR";

// This file is for functions and macros.

/**
 * FunctionDefinition is currently only used for TeX, where the identifiers are
 * emitted as macro symbols:
 *
 *   \def\f#1#2{(#1,#2,#1,#2)}
 *
 * While TeX calls these "macros", they happen at runtime.
 * Macros (like #define from C) are compile-time.
 *
 * Note this currently assumes the macros don't do any scanning.
 * E.g. TeX supports
 *  \def\f#1,#2;{#1#2#1#2} \f123,456;
 * in lieu of
 *  \def\f#1#2{#1#2#1#2} \f{123}{456}
 * For now, we don't allow the former. Allowing it will need a different node type.
 */
export interface FunctionDefinition extends BaseNode {
  readonly kind: "FunctionDefinition";
  readonly name: Identifier;
  readonly args: readonly Identifier[];
  readonly body: Node;
  /** Does the definition apply to all parent scopes too?
   * In TeX: false = \def or \edef;   true = \gdef or \xdef */
  readonly isGlobal: boolean;
  /** Does the definition expand its argument before defining?
   * In TeX: false = \def or \gdef;   true = \edef or \xdef */
  readonly isExpanded: boolean;
}

export function functionDefinition(
  name: IDCastable,
  args: readonly IDCastable[],
  body: Node,
  opts: { isGlobal?: boolean; isExpanded?: boolean } = {},
): FunctionDefinition {
  const isExpanded = opts.isExpanded ?? false;
  if (isExpanded && args.length > 0) {
    throw new Error("Expanded definition cannot have any args.");
  }
  return {
    kind: "FunctionDefinition",
    name: castID(name),
    args: args.map(castID),
    body,
    isGlobal: opts.isGlobal ?? false,
    isExpanded,
  };
}
