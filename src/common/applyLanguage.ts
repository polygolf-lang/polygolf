import { IR, isPolygolfOp, Node, polygolfOp, Program } from "../IR";
import { expandVariants } from "./expandVariants";
import { Language, defaultDetokenizer, Plugin, Language2 } from "./Language";
import { programToSpine } from "./Spine";
import polygolfLanguage from "../languages/polygolf";
import { getType } from "./getType";
import { stringify } from "./stringify";
import parse from "../frontend/parse";

// TODO: Implement heuristic search. There's currently no difference between "heuristic" and "full".
export type OptimisationLevel = "none" | "heuristic" | "full";
export type Objective = "bytes" | "chars";
export interface CompilationOptions {
  level: OptimisationLevel;
  objective: Objective;
  objectiveFunction: (x: string | null) => number;
  getAllVariants: boolean;
  skipTypecheck: boolean;
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

export function compilationOptions(
  level: OptimisationLevel,
  objective: Objective,
  objectiveFunction?: (x: string) => number,
  getAllVariants = false,
  skipTypecheck = false
): CompilationOptions {
  return {
    level,
    objective,
    objectiveFunction:
      objectiveFunction === undefined
        ? objective === "bytes"
          ? byteLength
          : charLength
        : (x) => (x === null ? Infinity : objectiveFunction(x)),
    getAllVariants,
    skipTypecheck,
  };
}

export interface CompilationResult {
  language: string;
  result: string | Error;
  history: string[];
  warnings: string[];
}

function compilationResult(
  language: string,
  result: string | Error,
  history: string[] = [],
  warnings: string[] = []
): CompilationResult {
  return {
    language,
    result,
    history,
    warnings,
  };
}

export function applyAll(program: IR.Program, ...visitors: Plugin["visit"][]) {
  return visitors.reduce(
    (prog, visitor) =>
      programToSpine(prog).withReplacer((n, s) => {
        const repl = visitor(n, s);
        return repl === undefined
          ? undefined
          : copySource(n, copyTypeAnnotation(n, repl));
      }).node as IR.Program,
    program
  );
}

function applyLinear(
  language: Language2,
  program: Program,
  startPhase = 0
): IR.Program {
  for (const phase of language.phases.slice(startPhase)) {
    if (phase.mode !== "search") {
      program = applyAll(program, ...phase.plugins.map((x) => x.visit));
    }
  }
  return program;
}

function applyRequired(
  language: Language2,
  program: Program,
  startPhase = 0
): IR.Program {
  for (const phase of language.phases.slice(startPhase)) {
    if (phase.mode === "required") {
      program = applyAll(program, ...phase.plugins.map((x) => x.visit));
    }
  }
  return program;
}

function emit(language: Language2, program: Program) {
  return (language.detokenizer ?? defaultDetokenizer())(
    language.emitter(program)
  );
}

function isError(x: any): x is Error {
  return x instanceof Error;
}

export function compile(
  source: string,
  options: CompilationOptions,
  ...languages: Language2[]
): CompilationResult[] {
  const obj = options.objectiveFunction;
  let program: Program;
  try {
    program = parse(source);
  } catch (e) {
    if (isError(e)) return [compilationResult("Polygolf", e)];
  }
  program = program!;
  let variants = expandVariants(program).map((x) => {
    try {
      if (!options.skipTypecheck) typecheck(x);
      return x;
    } catch (e) {
      if (isError(e)) return compilationResult("Polygolf", e);
      throw e;
    }
  });

  if (!options.getAllVariants) {
    const errorlessVariants = variants.filter((x) => "body" in x);
    if (errorlessVariants.length == 0) {
      return [errorlessVariants[0] as CompilationResult];
    }
    variants = errorlessVariants;
  }

  const result: CompilationResult[] = [];
  for (const language of languages) {
    const outputs = variants.map((x) =>
      "body" in x ? compileVariant(x, options, language) : x
    );
    if (options.getAllVariants) {
      result.push(...outputs);
    } else {
      const res = outputs.reduce((a, b) =>
        isError(a.result)
          ? b
          : isError(b.result)
          ? a
          : obj(a.result) < obj(b.result)
          ? a
          : b
      );
      if (isError(res.result) && variants.length > 1)
        res.result.message =
          "No variant could be compiled: " + res.result.message;
      result.push(res);
    }
  }
  return result;
}

interface SearchState {
  program: Program;
  startPhase: number;
  length: number;
  history: string[];
}

/*
TODO: Add this to all languages as a preprocess step
(x: Program) =>
          applyAll(x, (node) => {
            if (isPolygolfOp(node, "print_int", "println_int")) {
              return polygolfOp(
                node.op === "print_int" ? "print" : "println",
                polygolfOp("int_to_text", node.args[0])
              );
            }
          })

*/

export function compileVariant(
  program: Program,
  options: CompilationOptions,
  language: Language2
): CompilationResult {
  if (options.level === "none" || options.level === "heuristic") {
    try {
      return compilationResult(
        language.name,
        emit(
          language,
          (options.level === "none" ? applyRequired : applyLinear)(
            language,
            program
          )
        )
      );
    } catch (e) {
      if (isError(e)) {
        return compilationResult(language.name, e);
      }
      throw e;
    }
  }
  const obj = options.objectiveFunction;
  const finish = (prog: Program, startPhase = 0) =>
    emit(language, applyLinear(language, prog, startPhase));
  const visited = new Set<string>();
  const queue = [
    { program, startPhase: 0, length: obj(finish(program)), history: [] },
  ];
}

// Upper is OK

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
        pushToQueue(applyAll(program, plugin.visit), newHist);
      } else {
        for (const altProgram of spine.compactMap((n, s) => {
          const ret = plugin.visit(n, s);
          if (ret !== undefined) {
            return s.replacedWith(
              copySource(n, copyTypeAnnotation(n, ret)),
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

function copyTypeAnnotation(from: Node, to: Node): Node {
  // copy type annotation if present
  return to.kind !== "Program" &&
    from.kind !== "Program" &&
    from.type !== undefined
    ? { ...to, type: from.type }
    : to;
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
