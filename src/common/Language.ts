import { type Node } from "IR";
import { type Spine, type PluginVisitor, programToSpine } from "./Spine";
import { type CompilationContext } from "./compile";
import type { PathFragment } from "./fragments";

export interface Emitter {
  emit: (program: Node, context: CompilationContext) => string;
}

export type Token = "\n" | "$GLUE$" | "$INDENT$" | "$DEDENT$" | (string & {});
type TokenTreeArray = Array<Token | TokenTreeArray>;
export type TokenTree = Token | TokenTreeArray;
export function flattenTree(tokenTree: TokenTree): string[] {
  const flattened: string[] = [];

  function stepTree(t: TokenTree) {
    if (typeof t === "string") flattened.push(t);
    else t.map(stepTree);
  }
  stepTree(tokenTree);
  return flattened;
}

export abstract class DetokenizingEmitter implements Emitter {
  abstract emitTokens(program: Node, context: CompilationContext): Token[];
  abstract detokenize(tokens: Token[], context: CompilationContext): string;
  emit(program: Node, context: CompilationContext) {
    return this.detokenize(this.emitTokens(program, context), context);
  }
}

export type EmitterVisitResult = (string | PathFragment | EmitterVisitResult)[];

export abstract class VisitorEmitter extends DetokenizingEmitter {
  abstract detokenize(tokens: Token[]): string;
  abstract visit(
    node: Node,
    spine: Spine,
    context: CompilationContext,
  ): EmitterVisitResult;
  emit(program: Node, context: CompilationContext) {
    const tokens: Token[] = [];
    const collect = (item: EmitterVisitResult, spine: Spine) => {
      for (const o of item) {
        if (typeof o === "string") {
          tokens.push(o);
        } else if (Array.isArray(o)) {
          collect(o, spine);
        } else {
          const childSpine = spine.getChild(o);
          collect(this.visit(childSpine.node, childSpine, context), childSpine);
        }
      }
    };
    const programSpine = programToSpine(program);
    collect(this.visit(program, programSpine, context), programSpine);
    return this.detokenize(tokens);
  }
}

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
  readsFromStdinOnCodeDotGolf?: boolean;
}

export type LanguagePhaseMode = "required" | "simplegolf" | "search";

export interface LanguagePhase {
  mode: LanguagePhaseMode;
  plugins: Plugin[];
}

function languagePhase(
  mode: LanguagePhaseMode,
  plugins: (Plugin | PluginVisitor)[],
): LanguagePhase {
  return {
    mode,
    plugins: plugins.map((x) =>
      typeof x === "function" ? { name: x.name, visit: x } : x,
    ),
  };
}

export function required(
  ...plugins: (Plugin | PluginVisitor)[]
): LanguagePhase {
  return languagePhase("required", plugins);
}

export function simplegolf(
  ...plugins: (Plugin | PluginVisitor)[]
): LanguagePhase {
  return languagePhase("simplegolf", plugins);
}

export function search(...plugins: (Plugin | PluginVisitor)[]): LanguagePhase {
  return languagePhase("search", plugins);
}

export interface Plugin {
  name: string;
  /** If set, annotates the replacement with the calculated type of the original node. */
  bakeType?: boolean;
  /** visit should return one or more viable replacement nodes, or undefined to represent
   * no replacement. The replacement nodes should be different in value than
   * the initial node if it compares different under reference equality */
  visit: PluginVisitor;
}

export type WhitespaceInsertLogic = (a: string, b: string) => boolean;

export interface IdentifierGenerator {
  preferred: (original: string) => string[];
  short: string[];
  general: (i: number) => string;
  reserved: string[];
}

function isWord(a: string, i: number): boolean {
  return /\w/.test(a[i]);
}

export function defaultWhitespaceInsertLogic(a: string, b: string): boolean {
  return isWord(a, a.length - 1) && isWord(b, 0);
}

export function defaultDetokenizer(
  whitespace: WhitespaceInsertLogic = defaultWhitespaceInsertLogic,
  indent = 1,
): (x: Token[]) => string {
  return function (tokens: Token[]): string {
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
