import { IR } from "IR";

export interface Language {
  name: string;
  plugins: Plugin[];
  emitter: Emitter;
}

export type Plugin = (program: IR.Program) => IR.Program;

export type Emitter = (program: IR.Program) => string;
