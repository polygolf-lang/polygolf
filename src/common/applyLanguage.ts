import { IR, isPolygolfOp, Node, polygolfOp, Program } from "../IR";
import { expandVariants } from "./expandVariants";
import { Language, defaultDetokenizer, Plugin, Language2 } from "./Language";
import { programToSpine, Spine } from "./Spine";
import polygolfLanguage from "../languages/polygolf";
import { getType } from "./getType";
import { stringify } from "./stringify";
import parse from "../frontend/parse";

// TODO: Implement heuristic search. There's currently no difference between "heuristic" and "full".
export type OptimisationLevel = "none" | "heuristic" | "full";
export type Objective = "bytes" | "chars";
export interface SearchOptions {
  level: OptimisationLevel;
  objective: Objective;
  objectiveFunction: (x: string | null) => number;
  getAllVariants: boolean;
}

// This is what code.golf uses for char scoring
// https://github.com/code-golf/code-golf/blob/13733cfd472011217031fb9e733ae9ac177b234b/js/_util.ts#L7
export const charLength = (str: string | null) => {
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

export const byteLength = (x: string | null) =>
  x === null ? Infinity : Buffer.byteLength(x, "utf-8");

export function searchOptions(
  level: OptimisationLevel,
  objective: Objective,
  objectiveFunction?: (x: string) => number,
  getAllVariants?: boolean
): SearchOptions {
  return {
    level,
    objective,
    objectiveFunction:
      objectiveFunction === undefined
        ? objective === "bytes"
          ? byteLength
          : charLength
        : (x) => (x === null ? Infinity : objectiveFunction(x)),
    getAllVariants: getAllVariants === true,
  };
}

export interface CompilationResult {
  language: Language;
  result: string | Error;
  warnings: string[];
}

function compilationResult(
  language: Language,
  result: string | Error,
  warnings: string[] = []
): CompilationResult {
  return {
    language,
    result,
    warnings,
  };
}

export function compile(
  source: string,
  options: SearchOptions,
  ...languages: Language[]
): CompilationResult[] {
  const obj = options.objectiveFunction;
  let program: Program;
  try {
    program = parse(source);
  } catch (e) {
    if (isError(e)) return [compilationResult(polygolfLanguage, e)];
  }
  program = program!;
  let variants = expandVariants(program).map((x) => {
    try {
      typecheck(x);
      return x;
    } catch (e) {
      if (isError(e)) return e;
      throw e;
    }
  });
  if (variants.every(isError)) {
    return [compilationResult(polygolfLanguage, variants[0] as Error)];
  }
  if (!options.getAllVariants) variants = variants.filter((x) => !isError(x));

  const result: CompilationResult[] = [];
  for (const language of languages) {
    const outputs = variants.map((x) =>
      isError(x) ? x : (search(x, options, language) as string | Error)
    );
    if (options.getAllVariants) {
      result.push(...outputs.map((x) => compilationResult(language, x)));
    } else {
      const res = outputs.reduce((a, b) =>
        isError(a) ? b : isError(b) ? a : obj(a) < obj(b) ? a : b
      );
      if (isError(res) && variants.length > 1)
        res.message = "No variant could be compiled: " + res.message;
      result.push(compilationResult(language, res));
    }
  }
  return result;
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
  if (options.objective === "bytes" || packers.length < 1) return bestUnpacked;
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
    searchOptions(options.level, "chars", (x) => charLength(packer(x)))
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

function getFinalEmit(language: Language, nogolf = false) {
  const detokenizer = language.detokenizer ?? defaultDetokenizer();
  return (ir: IR.Program) => {
    const program = language.emitPlugins
      .concat(language.finalEmitPlugins)
      .filter((x) => x.skipWhenNogolf !== true || !nogolf)
      .reduce(
        (program, plugin) => applyAll(program, plugin.visit, plugin.bakeType),
        ir
      );
    return detokenizer(language.emitter(program));
  };
}

export const debugEmit = getFinalEmit(polygolfLanguage);

export function applyAll(
  program: IR.Program,
  visitor: Plugin["visit"],
  bakeType = false
) {
  return programToSpine(program).withReplacer((n, s) => {
    const repl = visitor(n, s);
    return repl === undefined
      ? undefined
      : copySource(n, annotateBasedOn(repl, n, bakeType ? program : undefined));
  }).node as IR.Program;
}

function isError(x: any): x is Error {
  return x instanceof Error;
}

interface SearchState {
  program: Program;
  startPhase: number;
  length: number;
}

function applyRequired(
  language: Language2,
  program: Program,
  startPhase = 0
): string {
  for (let i = startPhase; i < language.phases.length; i++) {
    const phase = language.phases[i];
    if (phase.mode === "required") {
      program = applyAll(program, ...phase.plugins);
    }
  }
}

/** Return the emitted form of the shortest non-error-throwing variant, or
 * throw an error if every variant throws */
export function applyLanguageToVariants(
  language: Language,
  variants: IR.Program[],
  options: SearchOptions,
  skipTypecheck = false
): string {
  const finalEmit = getFinalEmit(language, options.level === "none");
  const golfPlugins =
    options.level === "none"
      ? []
      : language.golfPlugins.concat(language.emitPlugins);
  const obj = options.objectiveFunction;
  const preprocess = // TODO, abstract this as part of #150
    language.name === "Polygolf"
      ? (x: Program) => x
      : (x: Program) =>
          applyAll(
            x,
            (node) => {
              if (isPolygolfOp(node, "print_int", "println_int")) {
                return polygolfOp(
                  node.op === "print_int" ? "print" : "println",
                  polygolfOp("int_to_text", node.args[0])
                );
              }
            },
            true
          );
  const ret = variants
    .map((variant) =>
      golfProgram(
        variant,
        preprocess,
        golfPlugins,
        finalEmit,
        obj,
        skipTypecheck
      )
    )
    .reduce((a, b) =>
      isError(a) ? b : isError(b) ? a : obj(a) < obj(b) ? a : b
    );
  if (isError(ret)) {
    ret.message =
      "No variant could be compiled: " + language.name + " " + ret.message;
    throw ret;
  }
  return ret;
}

/** Returns an error if the program cannot be emitted */
function golfProgram(
  program: IR.Program,
  preprocess: (ir: IR.Program) => IR.Program,
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
    program = preprocess(program);
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
    const s = stringify(prog);
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
        pushToQueue(applyAll(program, plugin.visit, plugin.bakeType), newHist);
      } else {
        for (const altProgram of spine.compactMap((n, s) => {
          const ret = plugin.visit(n, s);
          if (ret !== undefined) {
            return s.replacedWith(
              copySource(
                n,
                annotateBasedOn(
                  ret,
                  n,
                  plugin.bakeType === true ? s : undefined
                )
              ),
              true
            ).root.node;
          }
        })) {
          pushToQueue(altProgram, newHist);
        }
      }
    }
  }
  return shortestSoFar;
}

function annotateBasedOn(
  node: Node,
  other: Node,
  context?: Spine | Program
): Node {
  if (node.kind === "Program" || other.kind === "Program") {
    return node;
  }
  // copy type annotation if present
  const type =
    node.type ??
    other.type ??
    (context !== undefined ? getType(other, context) : undefined);
  return { ...node, type };
}

function copySource(from: Node, to: Node): Node {
  // copy source reference if present
  return { ...to, source: from.source };
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
