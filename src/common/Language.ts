import { Expr, IR } from "IR";
import { Spine, PluginVisitor } from "./Spine";
import { CompilationContext } from "./compile";

export type OpTransformOutput =
  | ((args: readonly IR.Expr[], spine: Spine<Expr>) => IR.Expr | undefined)
  | IR.Expr;

export interface Packer {
  codepointRange: [number, number];
  pack: (x: string) => string | null;
}

/** A language configuration.
 *
 * Somewhat declarative setup. `compileVariant` always starts with a frontend IR
 * and ends up with a string in the following sequence:
 *
 * (parse input) => IR
 * => (IR transform phases) => IR limited to nodes the emitter supports
 * => (emitter) => token list
 * => (detokenizer) => string
 */

export interface Language {
  name: string;
  extension: string;
  phases: LanguagePhase[];
  emitter: Emitter;
  noEmitter?: Emitter; // emitter used with the `noEmit` flag
  packers?: Packer[];
  detokenizer?: Detokenizer;
}

export type LanguagePhaseMode = "required" | "simplegolf" | "search";

export interface LanguagePhase {
  mode: LanguagePhaseMode;
  plugins: Plugin[];
}

export function required(...plugins: Plugin[]): LanguagePhase {
  return {
    mode: "required",
    plugins,
  };
}

export function simplegolf(...plugins: Plugin[]): LanguagePhase {
  return {
    mode: "simplegolf",
    plugins,
  };
}

export function search(...plugins: Plugin[]): LanguagePhase {
  return {
    mode: "search",
    plugins,
  };
}

export interface Plugin {
  name: string;
  /** visit should return one or more viable replacement nodes, or undefined to represent
   * no replacement. The replacement nodes should be different in value than
   * the initial node if it compares different under reference equality */
  visit: PluginVisitor<IR.Node[] | IR.Node | undefined>;
}

type TokenTreeArray = Array<string | TokenTreeArray>;
export type TokenTree = string | TokenTreeArray;
export type Detokenizer = (tokens: TokenTree) => string;
export type WhitespaceInsertLogic = (a: string, b: string) => boolean;

export function flattenTree(tokenTree: TokenTree): string[] {
  const flattened: string[] = [];

  function stepTree(t: TokenTree) {
    if (typeof t === "string") flattened.push(t);
    else t.map(stepTree);
  }
  stepTree(tokenTree);
  return flattened;
}

export interface IdentifierGenerator {
  preferred: (original: string) => string[];
  short: string[];
  general: (i: number) => string;
}

export type Emitter = (
  program: IR.Program,
  context: CompilationContext
) => TokenTree;

function isWord(a: string, i: number): boolean {
  return /\w/.test(a[i]);
}

export function defaultWhitespaceInsertLogic(a: string, b: string): boolean {
  return isWord(a, a.length - 1) && isWord(b, 0);
}

export function defaultDetokenizer(
  whitespace: WhitespaceInsertLogic = defaultWhitespaceInsertLogic,
  indent = 1
): Detokenizer {
  return function (tokenTree: TokenTree): string {
    const tokens: string[] = flattenTree(tokenTree);
    let indentLevel = 0;
    let result = tokens[0];
    for (let i = 1; i < tokens.length; i++) {
      if (tokens[i] === "$INDENT$") indentLevel++;
      else if (tokens[i] === "$DEDENT$") indentLevel--;
      else if (tokens[i] !== "$GLUE$") {
        if (
          tokens[i - 1] !== "$INDENT$" &&
          tokens[i - 1] !== "$DEDENT$" &&
          tokens[i - 1] !== "$GLUE$" &&
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
