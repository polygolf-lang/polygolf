import {
  type If,
  type IR,
  type Integer,
  type ConditionalOp,
  isOfKind,
} from "../IR";
import { $ } from "./fragments";
import type { TokenTree } from "./Language";
import type { Spine } from "./Spine";
import { codepoints, plainReplace } from "./strings";

export function joinTrees(
  sep: TokenTree,
  groups: readonly TokenTree[],
): TokenTree {
  return groups.flatMap((x, i) => (i > 0 ? [sep, x] : [x]));
}

/**
 * Constructs a function that chooses the shortest option to represent the given string as a string literal.
 * Each option's key is how the string "TEXT" should look after emit, value is an object representing a collection of substitution.
 * Substitution of the form `somechar: null` indicates that `somechar` cannot be present in the string in this option.
 * Each resulting codepoint is mapped using `codepointMap`, if provided.
 */
export function emitTextFactory(
  options: Record<
    `${string}TEXT${string}`,
    | Record<string, string>
    | { cantMatch: RegExp; subs?: Record<string, string> }
  >,
  codepointMap?: (x: number, i: number, arr: number[]) => string,
) {
  return function (
    value: string,
    [low, high]: [number, number] = [1, Infinity],
  ) {
    let result = "";
    for (const [template, behaviour] of Object.entries(options)) {
      const [cantMatch, subs] =
        "cantMatch" in behaviour
          ? [
              behaviour.cantMatch as RegExp,
              Object.entries(behaviour.subs ?? {}),
            ]
          : [undefined, Object.entries(behaviour)];
      if (cantMatch?.test(value) === true) continue;
      let current = value;
      for (const [c, d] of subs) {
        if (d === null) continue;
        current = plainReplace(current, c, d);
      }
      current = plainReplace(template, "TEXT", current);
      if (!(codepointMap === undefined || (low === 1 && high === Infinity)))
        current = codepoints(current)
          .map((x, i, arr) =>
            low <= x && x <= high
              ? String.fromCharCode(x)
              : codepointMap(x, i, arr),
          )
          .join("");
      if (result === "" || current.length < result.length) result = current;
    }
    return result;
  };
}

export function containsMultiNode(exprs: readonly IR.Node[]): boolean {
  for (const expr of exprs) {
    if ("consequent" in expr || "children" in expr || "body" in expr) {
      return true;
    }
  }
  return false;
}

export function shortest(x: string[]) {
  return x.reduce((x, y) => (x.length <= y.length ? x : y));
}

export function emitIntLiteral(
  n: Integer,
  bases: Record<number, [string, string]> = { 10: ["", ""] },
) {
  if (-10000 < n.value && n.value < 10000) return n.value.toString();
  const isNegative = n.value < 0;
  const abs = isNegative ? -n.value : n.value;
  const absEmit = shortest(
    Object.entries(bases).map(
      ([b, [pre, suf]]) => `${pre}${abs.toString(Number(b))}${suf}`,
    ),
  );
  return isNegative ? `-${absEmit}` : absEmit;
}

/**
 * Decomposes a nested chain of if conditions into a flat structure.
 */
export function getIfChain(spine: Spine<If | ConditionalOp>): {
  ifs: { condition: Spine; consequent: Spine }[];
  alternate: Spine | undefined;
} {
  const ifs = [
    {
      condition: spine.getChild($.condition),
      consequent: spine.getChild($.consequent),
    },
  ];
  let alternate = spine.getChild($.alternate);
  while (
    alternate.node !== undefined &&
    isOfKind(spine.node.kind)(alternate.node)
  ) {
    ifs.push({
      condition: alternate.getChild($.condition),
      consequent: alternate.getChild($.consequent),
    });
    alternate = alternate.getChild($.alternate);
  }
  return {
    ifs,
    alternate: alternate.node === undefined ? undefined : alternate,
  };
}
