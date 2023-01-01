import { IR } from "../IR";
import { expandVariants } from "./expandVariants";
import { Language, defaultDetokenizer, Plugin } from "./Language";
import { programToSpine } from "./Spine";
import polygolfLanguage from "../languages/polygolf";

export type OptimisationLevel = "none" | "heuristic" | "full";
export type Objective = "bytes" | "chars";
export interface SearchOptions {
  level: OptimisationLevel;
  objective: Objective;
  objectiveFunction: (x: string) => number;
}

export function searchOptions(
  level: OptimisationLevel,
  objective: Objective,
  objectiveFunction?: (x: string) => number
): SearchOptions {
  return {
    level,
    objective,
    objectiveFunction:
      objectiveFunction ??
      (objective === "bytes"
        ? (x) => Buffer.byteLength(x, "utf-8")
        : (x) => x.length),
  };
}

export default function applyLanguage(
  language: Language,
  program: IR.Program,
  options: SearchOptions
): string {
  return applyLanguageToVariants(
    language,
    language.name === "Polygolf" ? [program] : expandVariants(program),
    options
  );
}

function getFinalEmit(language: Language) {
  const detokenizer = language.detokenizer ?? defaultDetokenizer();
  return (ir: IR.Program) => {
    const program = language.emitPlugins
      .concat(language.finalEmitPlugins)
      .reduce((program, plugin) => applyAll(program, plugin.visit), ir);
    return detokenizer(language.emitter(program));
  };
}

export const debugEmit = getFinalEmit(polygolfLanguage);

export function applyAll(program: IR.Program, visitor: Plugin["visit"]) {
  return programToSpine(program).withReplacer(visitor).node as IR.Program;
}

function isError(x: any): x is Error {
  return x instanceof Error;
}

/** Return the emitted form of the shortest non-error-throwing variant, or
 * throw an error if every variant throws */
export function applyLanguageToVariants(
  language: Language,
  variants: IR.Program[],
  options: SearchOptions
): string {
  const finalEmit = getFinalEmit(language);
  const golfPlugins =
    options.level === "none"
      ? []
      : language.golfPlugins.concat(language.emitPlugins);
  const obj = options.objectiveFunction;
  const ret = variants
    .map((variant) => golfProgram(variant, golfPlugins, finalEmit, obj))
    .reduce((a, b) =>
      isError(a) ? b : isError(b) ? a : obj(a) < obj(b) ? a : b
    );
  if (isError(ret)) {
    ret.message = "No variant could be compiled: " + ret.message;
    throw ret;
  }
  return ret;
}

/** Returns an error if the program cannot be emitted */
function golfProgram(
  program: IR.Program,
  golfPlugins: Plugin[],
  finalEmit: (ir: IR.Program) => string,
  objective: (x: string) => number
): string | Error {
  // room for improvement: use this as an actual priority queue
  /** Array of [program, length, plugin hist] */
  const pq: [IR.Program, number, string[]][] = [];
  let shortestSoFar: string;
  try {
    shortestSoFar = finalEmit(program);
  } catch (e) {
    if (isError(e)) return e;
    throw e;
  }
  const visited = new Set<string>();
  const pushToQueue = (prog: IR.Program, hist: string[]) => {
    // cache based on JSON.stringify instead of finalEmit because
    //   1. finalEmit may error
    //   2. distinct program IRs can emit to the same target code (e.g
    //      `polygolfOp("+",a,b)` vs `functionCall("+",a,b)`)
    // room for improvement? custom compare function. Might be able to
    // O(log(nodes)) checking for duplicates instead of O(nodes) stringification
    const s = JSON.stringify(prog, (_, value) =>
      typeof value === "bigint" ? value.toString() + "n" : value
    );
    if (visited.has(s)) return;
    visited.add(s);
    try {
      const code = finalEmit(prog);
      if (objective(code) < objective(shortestSoFar)) shortestSoFar = code;
      // 200 is arbitrary limit for performance to stop the search, since we're
      // currently using naive BFS with no pruning.
      // room for improvement: prune bad options
      if (visited.size < 200) pq.push([prog, objective(code), hist]);
    } catch {
      // Ignore for now, assuming it's using an unsupported language feature
      // A warning might be appropriate
    }
  };
  pushToQueue(program, []);
  // BFS over the full search space
  while (pq.length > 0) {
    const [program, , hist] = pq.shift()!;
    const spine = programToSpine(program);
    for (const plugin of golfPlugins) {
      const newHist = hist.concat([plugin.name]);
      if (plugin.allOrNothing === true) {
        pushToQueue(applyAll(program, plugin.visit), newHist);
      } else {
        for (const altProgram of spine.compactMap((n, s) => {
          const ret = plugin.visit(n, s);
          if (ret !== undefined) {
            // copy type annotation if present
            const repl =
              ret.kind !== "Program" &&
              n.kind !== "Program" &&
              n.type !== undefined
                ? { ...ret, type: n.type }
                : ret;
            // mark one more replacement idea.
            return s.replacedWith(repl).root.node;
          }
        })) {
          pushToQueue(altProgram, newHist);
        }
      }
    }
  }
  return shortestSoFar;
}
