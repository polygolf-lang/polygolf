import { IR, Node, Program } from "../IR";
import { expandVariants } from "./expandVariants";
import { defaultDetokenizer, Plugin, Language } from "./Language";
import { AddWarning, programToSpine, Spine } from "./Spine";
import { getType } from "./getType";
import { stringify } from "./stringify";
import parse from "../frontend/parse";
import { MinPriorityQueue } from "@datastructures-js/priority-queue";
import polygolfLanguage from "../languages/polygolf";

export type OptimisationLevel = "nogolf" | "simple" | "full";
export type Objective = "bytes" | "chars";
export interface CompilationOptions {
  level: OptimisationLevel;
  objective: Objective | ((x: string | null) => number);
  getAllVariants?: boolean;
  skipTypecheck?: boolean;
  restrictFrontend?: boolean;
  asciiOnly?: boolean;
}

export function getObjectiveFunc(options: CompilationOptions) {
  if (options.objective === "bytes") return byteLength;
  if (options.objective === "chars") return charLength;
  return options.objective;
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

export interface CompilationResult {
  language: string;
  result: string | Error;
  history: string[];
  warnings: Error[];
}

function compilationResult(
  language: string,
  result: string | Error,
  history: string[] = [],
  warnings: Error[] = []
): CompilationResult {
  return {
    language,
    result,
    history,
    warnings,
  };
}

export function applyAll(
  program: IR.Program,
  addWarning: AddWarning,
  compilationOptions: CompilationOptions,
  ...visitors: Plugin["visit"][]
) {
  return visitors.reduce(
    (prog, visitor) =>
      programToSpine(prog).withReplacer((n, s) => {
        const repl = visitor(n, s, addWarning, compilationOptions);
        return repl === undefined
          ? undefined
          : copySource(n, copyTypeAnnotation(n, repl));
      }).node as IR.Program,
    program
  );
}

function* applyOne(
  spine: Spine,
  addWarning: AddWarning,
  compilationOptions: CompilationOptions,
  visitor: Plugin["visit"]
) {
  for (const altProgram of spine.compactMap((n, s) => {
    const ret = visitor(n, s, addWarning, compilationOptions);
    if (ret !== undefined) {
      return s.replacedWith(copySource(n, copyTypeAnnotation(n, ret)), true)
        .root.node;
    }
  })) {
    yield altProgram;
  }
}

function applyLinear(
  language: Language,
  program: Program,
  addWarning: AddWarning,
  compilationOptions: CompilationOptions,
  startPhase = 0
): IR.Program {
  for (const phase of language.phases.slice(startPhase)) {
    if (phase.mode !== "search") {
      program = applyAll(
        program,
        addWarning,
        compilationOptions,
        ...phase.plugins.map((x) => x.visit)
      );
    }
  }
  return program;
}

function applyRequired(
  language: Language,
  program: Program,
  addWarning: AddWarning,
  compilationOptions: CompilationOptions,
  startPhase = 0
): IR.Program {
  for (const phase of language.phases.slice(startPhase)) {
    if (phase.mode === "required") {
      program = applyAll(
        program,
        addWarning,
        compilationOptions,
        ...phase.plugins.map((x) => x.visit)
      );
    }
  }
  return program;
}

function emit(
  language: Language,
  program: Program,
  addWarning: AddWarning,
  compilationOptions: CompilationOptions
) {
  return (language.detokenizer ?? defaultDetokenizer())(
    language.emitter(program, addWarning, compilationOptions)
  );
}

function isError(x: any): x is Error {
  return x instanceof Error;
}

export default function compile(
  source: string,
  options: CompilationOptions,
  ...languages: Language[]
): CompilationResult[] {
  const obj = getObjectiveFunc(options);
  let program: Program;
  try {
    program = parse(source, options.restrictFrontend);
  } catch (e) {
    if (isError(e)) return [compilationResult("Polygolf", e)];
  }
  program = program!;
  let variants = expandVariants(program).map((x) => {
    try {
      if (options.skipTypecheck !== false) typecheck(x);
      return x;
    } catch (e) {
      if (isError(e)) return compilationResult("Polygolf", e);
      throw e;
    }
  });

  if (options.getAllVariants === true) {
    const errorlessVariants = variants.filter((x) => "body" in x);
    if (errorlessVariants.length === 0) {
      return [errorlessVariants[0] as CompilationResult];
    }
    variants = errorlessVariants;
  }

  const result: CompilationResult[] = [];
  for (const language of languages) {
    const outputs = variants.map((x) =>
      "body" in x ? compileVariant(x, options, language) : x
    );
    if (options.getAllVariants === true) {
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
  warnings: Error[];
  history: string[];
}

export function compileVariant(
  program: Program,
  options: CompilationOptions,
  language: Language
): CompilationResult {
  if (options.level === "nogolf" || options.level === "simple") {
    try {
      const warnings: Error[] = [];
      const addWarning = (x: Error) => warnings.push(x);
      return compilationResult(
        language.name,
        emit(
          language,
          (options.level === "nogolf" ? applyRequired : applyLinear)(
            language,
            program,
            addWarning,
            options
          ),
          addWarning,
          options
        ),
        language.phases
          .filter(
            options.level === "nogolf"
              ? (x) => x.mode === "required"
              : (x) => x.mode !== "search"
          )
          .flatMap((x) => x.plugins.map((y) => y.name)),
        warnings
      );
    } catch (e) {
      if (isError(e)) {
        return compilationResult(language.name, e);
      }
      throw e;
    }
  }
  const obj = getObjectiveFunc(options);
  const finish = (prog: Program, addWarning: AddWarning, startPhase = 0) =>
    emit(
      language,
      applyLinear(language, prog, addWarning, options, startPhase),
      addWarning,
      options
    );
  let shortestSoFar: SearchState;
  let shortestSoFarLength: number = Infinity;
  const latestPhaseWeSawTheProg = new Map<string, number>();
  const queue = new MinPriorityQueue<SearchState>((x) => x.length);
  const globalWarnings: Error[] = [];

  function enqueue(
    program: Program,
    startPhase: number,
    history: string[],
    warnings: Error[]
  ) {
    if (startPhase >= language.phases.length) return;
    if (latestPhaseWeSawTheProg.size > 200) return;
    const stringified = stringify(program);
    const latestSeen = latestPhaseWeSawTheProg.get(stringified);
    if (latestSeen === undefined || latestSeen < startPhase) {
      latestPhaseWeSawTheProg.set(stringified, startPhase);

      function addWarning(x: Error, isGlobal: boolean) {
        (isGlobal ? globalWarnings : warnings).push(x);
      }

      const length = obj(finish(program, addWarning, startPhase));
      const state = { program, startPhase, length, history, warnings };
      if (length < shortestSoFarLength) {
        shortestSoFarLength = length;
        shortestSoFar = state;
      }
      queue.enqueue(state);
    }
  }

  enqueue(program, 0, [], []);

  while (!queue.isEmpty()) {
    const state = queue.dequeue();
    const phase = language.phases[state.startPhase];
    const warnings = [...state.warnings];

    function addWarning(x: Error, isGlobal: boolean) {
      (isGlobal ? globalWarnings : warnings).push(x);
    }

    if (phase.mode !== "search") {
      enqueue(
        applyAll(
          state.program,
          addWarning,
          options,
          ...phase.plugins.map((x) => x.visit)
        ),
        state.startPhase + 1,
        [...state.history, ...phase.plugins.map((x) => x.name)],
        warnings
      );
    } else {
      enqueue(state.program, state.startPhase + 1, state.history, warnings);
      const spine = programToSpine(state.program);
      for (const plugin of phase.plugins) {
        const newHist = [...state.history, plugin.name];
        if (plugin.allOrNothing === true) {
          enqueue(
            applyAll(state.program, addWarning, options, plugin.visit),
            state.startPhase,
            newHist,
            warnings
          );
        } else {
          for (const altProgram of applyOne(
            spine,
            addWarning,
            options,
            plugin.visit
          )) {
            enqueue(altProgram, state.startPhase, newHist, warnings);
          }
        }
      }
    }
  }

  globalWarnings.push(...shortestSoFar!.warnings);

  return compilationResult(
    language.name,
    finish(
      shortestSoFar!.program,
      (x: Error) => {
        globalWarnings.push(x);
      },
      shortestSoFar!.startPhase
    ),
    [
      ...shortestSoFar!.history,
      ...language.phases
        .slice(shortestSoFar!.startPhase)
        .filter((x) => x.mode !== "search")
        .flatMap((x) => x.plugins.map((y) => y.name)),
    ],
    globalWarnings
  );
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

export function debugEmit(program: Program): string {
  const result = compileVariant(
    program,
    { level: "nogolf", objective: "bytes", skipTypecheck: true },
    polygolfLanguage
  ).result;
  if (typeof result === "string") {
    return result;
  }
  throw result;
}

export function normalize(source: string): string {
  return debugEmit(parse(source, false));
}
