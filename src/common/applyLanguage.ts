import { IR, Node, Program } from "../IR";
import { expandVariants } from "./expandVariants";
import { Language, defaultDetokenizer, Plugin } from "./Language";
import { programToSpine } from "./Spine";
import polygolfLanguage from "../languages/polygolf";
import { getType } from "./getType";

// TODO: Implement heuristic search. There's currently no difference between "heuristic" and "full".
export type OptimisationLevel = "none" | "heuristic" | "full";
export type Objective = "bytes" | "chars";
export interface SearchOptions {
  level: OptimisationLevel;
  objective: Objective;
  objectiveFunction: (x: string | null) => number;
}

// This is what code.golf uses for char scoring
// https://github.com/code-golf/code-golf/blob/13733cfd472011217031fb9e733ae9ac177b234b/js/_util.ts#L7
const charLen = (str: string | null) => {
  if (str === null) return Infinity;
  let i = 0;
  let len = 0;

  while (i < str.length) {
    const value = str.charCodeAt(i++);

    if (value >= 0xd800 && value <= 0xdbff && i < str.length) {
      // It's a high surrogate, and there is a next character.
      const extra = str.charCodeAt(i++);

      // Low surrogate.
      if ((extra & 0xfc00) === 0xdc00) {
        len++;
      } else {
        // It's an unmatched surrogate; only append this code unit, in
        // case the next code unit is the high surrogate of a
        // surrogate pair.
        len++;
        i--;
      }
    } else {
      len++;
    }
  }

  return len;
};

export function searchOptions(
  level: OptimisationLevel,
  objective: Objective,
  objectiveFunction?: (x: string) => number
): SearchOptions {
  return {
    level,
    objective,
    objectiveFunction:
      objectiveFunction === undefined
        ? objective === "bytes"
          ? (x) => (x === null ? Infinity : Buffer.byteLength(x, "utf-8"))
          : (x) => (x === null ? Infinity : charLen(x))
        : (x) => (x === null ? Infinity : objectiveFunction(x)),
  };
}

export default function applyLanguage(
  language: Language,
  program: IR.Program,
  options: SearchOptions,
  skipTypecheck = false
): string {
  const bestUnpacked = applyLanguageToVariants(
    language,
    language.name === "Polygolf" ? [program] : expandVariants(program),
    options,
    skipTypecheck
  );
  const packers = language.packers ?? [];
  if (options.objective === "bytes" || packers.length == 0) return bestUnpacked;
  function packer(code: string): string | null {
    if ([...code].map((x) => x.charCodeAt(0)).some((x) => x > 127)) return null;
    return packers
      .map((x) => x(code))
      .reduce((a, b) =>
        options.objectiveFunction(a) < options.objectiveFunction(b) ? a : b
      );
  }
  const bestForPacking = applyLanguageToVariants(
    language,
    language.name === "Polygolf" ? [program] : expandVariants(program),
    searchOptions(options.level, "chars", (x) => charLen(packer(x)))
  );
  const packed = packer(bestForPacking);
  if (
    packed != null &&
    options.objectiveFunction(packed) < options.objectiveFunction(bestUnpacked)
  ) {
    return packed;
  }
  return bestUnpacked;
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
  return programToSpine(program).withReplacer((n, s) => {
    const repl = visitor(n, s);
    return repl === undefined ? undefined : copyTypeAnnotation(n, repl);
  }).node as IR.Program;
}

function isError(x: any): x is Error {
  return x instanceof Error;
}

/** Return the emitted form of the shortest non-error-throwing variant, or
 * throw an error if every variant throws */
export function applyLanguageToVariants(
  language: Language,
  variants: IR.Program[],
  options: SearchOptions,
  skipTypecheck = false
): string {
  const finalEmit = getFinalEmit(language);
  const golfPlugins =
    options.level === "none"
      ? []
      : language.golfPlugins.concat(language.emitPlugins);
  const obj = options.objectiveFunction;
  const ret = variants
    .map((variant) =>
      golfProgram(variant, golfPlugins, finalEmit, obj, skipTypecheck)
    )
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
  objective: (x: string) => number,
  skipTypecheck = true
): string | Error {
  // room for improvement: use this as an actual priority queue
  /** Array of [program, length, plugin hist] */
  const pq: [IR.Program, number, string[]][] = [];
  let shortestSoFar: string;
  try {
    if (!skipTypecheck) typecheck(program);
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
    } catch (e) {
      console.log(e);
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
            return s.replacedWith(copyTypeAnnotation(n, ret)).root.node;
          }
        })) {
          pushToQueue(altProgram, newHist);
        }
      }
    }
  }
  return shortestSoFar;
}

function copyTypeAnnotation(from: Node, to: Node): Node {
  // copy type annotation if present
  return to.kind !== "Program" &&
    from.kind !== "Program" &&
    from.type !== undefined
    ? { ...to, type: from.type }
    : to;
}

/** Typecheck a program by asking all nodes about their types.
 * Throws an error on a type error; otherwise is a no-op. */
function typecheck(program: Program) {
  const spine = programToSpine(program);
  spine.everyNode((x) => {
    if (x.kind !== "Program") getType(x, program);
    return true;
  });
}
