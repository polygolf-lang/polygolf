import { type CompilationOptions, type CompilationResult } from "./compile";
import { InvariantError } from "./errors";
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

function withInvariantErrorWarningsFrom(
  a: CompilationResult,
  b: CompilationResult,
) {
  const res = {
    ...a,
    warnings: [
      ...a.warnings,
      ...b.warnings.filter((x) => x instanceof InvariantError),
    ],
  };
  if (typeof b.result !== "string" && b.result instanceof InvariantError) {
    res.warnings.push(b.result);
  }
  return res;
}

export function shorterBy(
  obj: ObjectiveFunc,
): (a: CompilationResult, b: CompilationResult) => CompilationResult {
  return (a, b) =>
    isError(a.result)
      ? withInvariantErrorWarningsFrom(b, a)
      : isError(b.result)
        ? withInvariantErrorWarningsFrom(a, b)
        : obj(a.result) < obj(b.result)
          ? withInvariantErrorWarningsFrom(a, b)
          : withInvariantErrorWarningsFrom(b, a);
}
