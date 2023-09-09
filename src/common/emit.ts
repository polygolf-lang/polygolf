import { Expr, IR, IntegerLiteral } from "IR";
import { PolygolfError } from "./errors";
import { TokenTree } from "./Language";

export function joinTrees(
  sep: TokenTree,
  groups: readonly TokenTree[]
): TokenTree {
  return groups.flatMap((x, i) => (i > 0 ? [sep, x] : [x]));
}

/**
 * Chooses the shortest option to represent the given string as a string literal.
 * Each option is described by the string delimiters (string or two strings) and an array of substitutions.
 * Substitution of the form `[somechar, null]` indicates that `somechar` cannot be present in the string in this option.
 */
export function emitTextLiteral(
  value: string,
  options: [string | [string, string], [string, string | null][]][] = [
    [
      `"`,
      [
        [`\\`, `\\\\`],
        [`\n`, `\\n`],
        [`\r`, `\\r`],
        [`"`, `\\"`],
      ],
    ],
  ]
): string {
  let result = "";
  for (const [delim, escapes] of options) {
    if (escapes.some((x) => x[1] === null && value.includes(x[0]))) continue;
    let current = value;
    for (const [c, d] of escapes) {
      if (d === null) continue;
      current = current.replaceAll(c, d);
    }
    if (typeof delim === "string") current = delim + current + delim;
    else current = delim[0] + current + delim[1];
    if (result === "" || current.length < result.length) result = current;
  }
  return result;
}

export function containsMultiExpr(exprs: readonly IR.Expr[]): boolean {
  for (const expr of exprs) {
    if ("consequent" in expr || "children" in expr || "body" in expr) {
      return true;
    }
  }
  return false;
}

export class EmitError extends PolygolfError {
  constructor(expr: Expr, detail?: string) {
    if (detail === undefined && "op" in expr && expr.op !== null)
      detail = expr.op;
    detail = detail === undefined ? "" : ` (${detail})`;
    const message = `emit error - ${expr.kind}${detail} not supported.`;
    super(message, expr.source);
    this.name = "EmitError";
    Object.setPrototypeOf(this, EmitError.prototype);
  }
}

export function shortest(x: string[]) {
  return x.reduce((x, y) => (x.length <= y.length ? x : y));
}

export function emitIntLiteral(
  n: IntegerLiteral,
  bases: Record<number, [string, string]> = { 10: ["", ""] }
) {
  if (n.value > -10000 && n.value < 10000) return n.value.toString();
  const isNegative = n.value < 0;
  const abs = isNegative ? -n.value : n.value;
  const absEmit = shortest(
    Object.entries(bases).map(
      ([b, [pre, suf]]) => `${pre}${abs.toString(Number(b))}${suf}`
    )
  );
  return isNegative ? `-${absEmit}` : absEmit;
}
