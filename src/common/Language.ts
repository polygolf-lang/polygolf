import { IR } from "IR";
import { Visitor } from "./traverse";

export interface Language {
  name: string;
  /** The visitors are applied in left-to-right order. */
  plugins: Visitor[];
  opMap?: Map<string, (arg: IR.Expr, arg2?: IR.Expr) => IR.Expr>;
  identGen: IdentifierGenerator;
  emitter: Emitter;
}

export interface IdentifierGenerator {
  preferred: (original: string) => string[];
  short: string[];
  general: (i: number) => string;
}

export type Emitter = (program: IR.Program) => string;

export const defaultIdentGen = {
  preferred(original: string) {
    const lower = original[0].toLowerCase();
    const upper = original[0].toUpperCase();
    return [original[0], original[0] === lower ? upper : lower];
  },
  short: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
  general: (i: number) => "v" + i.toString(),
};
