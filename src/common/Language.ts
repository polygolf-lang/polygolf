import { IR } from "IR";
import { Visitor } from "./traverse";

export type OpTransformOutput =
  | string
  | [string, number]
  | ((arg: IR.Expr, arg2: IR.Expr) => IR.Expr);

export interface Language {
  name: string;
  /** The visitors are applied in left-to-right order. */
  plugins: Visitor[];
  opMap: Map<string, OpTransformOutput>;
  dependencyMap?: Map<string, string>;
  identGen?: IdentifierGenerator;
  emitter: Emitter;
  detokenizer?: Detokenizer;
}

export type Detokenizer = (tokens: string[]) => string;
export type WhitespaceInsertLogic = (a: string, b: string) => boolean;

export interface IdentifierGenerator {
  preferred: (original: string) => string[];
  short: string[];
  general: (i: number) => string;
}

export type Emitter = (program: IR.Program) => string[];

export const defaultIdentGen = {
  preferred(original: string) {
    const lower = original[0].toLowerCase();
    const upper = original[0].toUpperCase();
    return [original[0], original[0] === lower ? upper : lower];
  },
  short: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  general: (i: number) => "v" + i.toString(),
};

function isAlphaNum(a: string, i: number): boolean {
  const code = a.charCodeAt(i);
  return (
    (code > 47 && code < 58) || // numeric (0-9)
    (code > 64 && code < 91) || // upper alpha (A-Z)
    (code > 96 && code < 123)
  ); // lower alpha (a-z)
}

export function defaultWhitespaceInsertLogic(a: string, b: string): boolean {
  return isAlphaNum(a, a.length - 1) && isAlphaNum(b, 0);
}

export function defaultDetokenizer(
  whitespace: WhitespaceInsertLogic = defaultWhitespaceInsertLogic
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
          tokens[i] + (tokens[i] === "\n" ? " ".repeat(indentLevel) : "");
      }
    }
    return result;
  };
}
