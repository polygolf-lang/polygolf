import { IR, Visitor } from "IR";

export interface Language {
  name: string;
  /** The visitors are applied in left-to-right order. */
  plugins: Visitor[];
  emitter: Emitter;
}

export type Emitter = (program: IR.Program) => string;
