import { IR } from "IR";
import { Spine } from "./Spine";

export type OpTransformOutput =
  | string
  | [string, number, boolean?]
  | ((args: readonly IR.Expr[]) => IR.Expr);

/** A language configuration.
 *
 * Somewhat declarative setup. `applyLanguage` always starts with a frontend IR
 * and ends up with a string in the following sequence:
 *
 * (parse input) => IR
 * => (golfPlugins and repeatable emitPlugins in any order) => IR
 * => (emitPlugins in the order specified) => IR limited to nodes the emitter supports
 * => (emitter) => token list
 * => (detokenizer) => string
 *
 * A repeatable emitPlugin is one without `finalEmitOnly: true`
 */
export interface Language {
  name: string;
  golfPlugins: Plugin[];
  emitPlugins: Plugin[];
  finalEmitPlugins?: Plugin[];
  emitter: Emitter;
  detokenizer?: Detokenizer;
}

export interface Plugin {
  name: string;
  /** visit should return a viable replacement node, or undefined to represent
   * no replacement. The replacement node should be different in value than
   * the initial node if it compares different under reference equality */
  visit: (spine: Spine) => IR.Node | undefined;
  /** Set `allOrNothing: true` to force all replacement nodes to be applied,
   * or none. This is useful in cases such as renaming variables */
  allOrNothing?: boolean;
}

export type Detokenizer = (tokens: string[]) => string;
export type WhitespaceInsertLogic = (a: string, b: string) => boolean;

export interface IdentifierGenerator {
  preferred: (original: string) => string[];
  short: string[];
  general: (i: number) => string;
}

export type Emitter = (program: IR.Program) => string[];

function isAlphaNum(a: string, i: number): boolean {
  return /[A-Za-z0-9]/.test(a[i]);
}

export function defaultWhitespaceInsertLogic(a: string, b: string): boolean {
  return isAlphaNum(a, a.length - 1) && isAlphaNum(b, 0);
}

export function defaultDetokenizer(
  whitespace: WhitespaceInsertLogic = defaultWhitespaceInsertLogic,
  indent = 1
): Detokenizer {
  return function (tokens: string[]): string {
    let indentLevel = 0;
    let result = tokens[0];
    for (let i = 1; i < tokens.length; i++) {
      if (tokens[i] === "$INDENT$") indentLevel++;
      else if (tokens[i] === "$DEDENT$") indentLevel--;
      else {
        if (
          tokens[i - 1] !== "$INDENT$" &&
          tokens[i - 1] !== "$DEDENT$" &&
          whitespace(tokens[i - 1], tokens[i])
        )
          result += " ";
        result +=
          tokens[i] +
          (tokens[i] === "\n" ? " ".repeat(indentLevel * indent) : "");
      }
    }
    return result.trim();
  };
}
