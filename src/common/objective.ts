import { type CompilationOptions, type CompilationResult } from "./compile";
import { byteLength, charLength } from "./strings";

export type Objective = "bytes" | "chars";
export type ObjectiveFunc = (x: string | null) => number;

export function getObjectiveFunc(options: CompilationOptions): ObjectiveFunc {
  if (options.objective === "bytes") return byteLength;
  if (options.objective === "chars") return charLength;
  return options.objective;
}

function isError(x: any): x is Error {
  return x instanceof Error;
}

export function shorterBy(
  obj: ObjectiveFunc,
): (a: CompilationResult, b: CompilationResult) => CompilationResult {
  return (a, b) =>
    isError(a.result)
      ? b
      : isError(b.result)
      ? a
      : obj(a.result) < obj(b.result)
      ? a
      : b;
}
