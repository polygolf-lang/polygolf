import { Node, Program } from "../IR";
import { expandVariants } from "./expandVariants";
import { defaultDetokenizer, Plugin, Language } from "./Language";
import { AddWarning, programToSpine, Spine } from "./Spine";
import { getType } from "./getType";
import { stringify } from "./stringify";
import parse from "../frontend/parse";
import { MinPriorityQueue } from "@datastructures-js/priority-queue";
import polygolfLanguage from "../languages/polygolf";
import {
  Objective,
  ObjectiveFunc,
  charLength,
  getObjectiveFunc,
  shorterBy,
} from "./objective";

export type OptimisationLevel = "nogolf" | "simple" | "full";
export interface CompilationOptions {
  level: OptimisationLevel;
  objective: Objective | ObjectiveFunc;
  getAllVariants?: boolean;
  skipTypecheck?: boolean;
  restrictFrontend?: boolean;
  asciiOnly?: boolean;
}

export interface CompilationResult {
  language: string;
  result: string | Error;
  history: [number, string][];
  warnings: Error[];
}

function compilationResult(
  language: string,
  result: string | Error,
  history: [number, string][] = [],
  warnings: Error[] = []
): CompilationResult {
  return {
    language,
    result,
    history,
    warnings,
  };
}

export function applyAllToAllAndGetCounts(
  program: Program,
  addWarning: AddWarning,
  compilationOptions: CompilationOptions,
  ...visitors: Plugin["visit"][]
): [Program, number[]] {
  const counts: number[] = [];
  let result = program;
  let c: number;
  for (const visitor of visitors) {
    [result, c] = applyToAllAndGetCount(
      result,
      addWarning,
      compilationOptions,
      visitor
    );
    counts.push(c);
  }
  return [result, counts];
}

export function applyToAllAndGetCount(
  program: Program,
  addWarning: AddWarning,
  compilationOptions: CompilationOptions,
  visitor: Plugin["visit"]
): [Program, number] {
  const result = programToSpine(program).withReplacer((n, s) => {
    const repl = visitor(n, s, addWarning, compilationOptions);
    return repl === undefined
      ? undefined
      : copySource(n, copyTypeAnnotation(n, repl));
  }).node as Program;
  return [result, program === result ? 0 : 1]; // TODO it might be a bit more informative to count the actual replacements, intead of returning 1
}

function* applyToOne(
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
      const res = outputs.reduce(shorterBy(obj));
      if (isError(res.result) && variants.length > 1)
        res.result.message =
          "No variant could be compiled: " + res.result.message;
      result.push(res);
    }
  }
  return result;
}

export function compileVariant(
  program: Program,
  options: CompilationOptions,
  language: Language
): CompilationResult {
  const obj = getObjectiveFunc(options);
  const bestUnpacked = compileVariantNoPacking(program, options, language);
  const packers = language.packers ?? [];
  if (
    options.objective !== "chars" ||
    packers.length < 1 ||
    isError(bestUnpacked.result)
  )
    return bestUnpacked;
  function packer(code: string | null): string | null {
    if (code === null) return null;
    if ([...code].map((x) => x.charCodeAt(0)).some((x) => x > 127)) return null;
    return packers
      .map((x) => x(code))
      .reduce((a, b) => (obj(a) < obj(b) ? a : b));
  }
  const bestForPacking = compileVariantNoPacking(
    program,
    {
      ...options,
      objective: (x) => charLength(packer(x)),
    },
    language
  );
  if (isError(bestForPacking.result)) return bestUnpacked;
  const packed = packer(bestForPacking.result);
  if (packed != null && obj(packed) < obj(bestUnpacked.result)) {
    return { ...bestForPacking, result: packed };
  }
  return bestUnpacked;
}

interface SearchState {
  program: Program;
  startPhase: number;
  length: number;
  warnings: Error[];
  history: [number, string][];
}

export function compileVariantNoPacking(
  program: Program,
  options: CompilationOptions,
  language: Language
): CompilationResult {
  const phases = language.phases;
  if (options.level === "nogolf" || options.level === "simple") {
    try {
      const warnings: Error[] = [];
      const addWarning = (x: Error) => warnings.push(x);
      const plugins = phases
        .filter(
          options.level === "nogolf"
            ? (x) => x.mode === "required"
            : (x) => x.mode !== "search"
        )
        .flatMap((x) => x.plugins);
      const [res, counts] = applyAllToAllAndGetCounts(
        program,
        addWarning,
        options,
        ...plugins.map((x) => x.visit)
      );
      return compilationResult(
        language.name,
        emit(language, res, addWarning, options),
        plugins.map((y, i) => [counts[i], y.name]),
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
  function finish(
    prog: Program,
    addWarning: AddWarning,
    startPhase = 0
  ): [string, [number, string][]] {
    const finishingPlugins = phases
      .slice(startPhase)
      .filter((x) => x.mode !== "search")
      .flatMap((x) => x.plugins);
    const [resProg, counts] = applyAllToAllAndGetCounts(
      prog,
      addWarning,
      options,
      ...finishingPlugins.map((x) => x.visit)
    );
    return [
      emit(language, resProg, addWarning, options),
      finishingPlugins.map((x, i) => [counts[i], x.name]),
    ];
  }
  let shortestSoFar: SearchState | undefined;
  let lastError: Error;
  let shortestSoFarLength: number = Infinity;
  const latestPhaseWeSawTheProg = new Map<string, number>();
  const queue = new MinPriorityQueue<SearchState>((x) => x.length);
  const globalWarnings: Error[] = [];

  function enqueue(
    program: Program,
    startPhase: number,
    history: [number, string][],
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

      try {
        const length = obj(finish(program, addWarning, startPhase)[0]);
        const state = { program, startPhase, length, history, warnings };
        if (length < shortestSoFarLength) {
          shortestSoFarLength = length;
          shortestSoFar = state;
        }
        queue.enqueue(state);
      } catch (e) {
        if (isError(e)) {
          lastError = e;
        }
      }
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
      const [res, counts] = applyAllToAllAndGetCounts(
        state.program,
        addWarning,
        options,
        ...phase.plugins.map((x) => x.visit)
      );
      enqueue(
        res,
        state.startPhase + 1,
        [
          ...state.history,
          ...phase.plugins.map(
            (x, i) => [counts[i], x.name] satisfies [number, string]
          ),
        ],
        warnings
      );
    } else {
      enqueue(state.program, state.startPhase + 1, state.history, warnings);
      const spine = programToSpine(state.program);
      for (const plugin of phase.plugins) {
        if (plugin.allOrNothing === true) {
          const [res, c] = applyToAllAndGetCount(
            state.program,
            addWarning,
            options,
            plugin.visit
          );
          enqueue(
            res,
            state.startPhase,
            [...state.history, [c, plugin.name]],
            warnings
          );
        } else {
          for (const altProgram of applyToOne(
            spine,
            addWarning,
            options,
            plugin.visit
          )) {
            enqueue(
              altProgram,
              state.startPhase,
              [...state.history, [1, plugin.name]],
              warnings
            );
          }
        }
      }
    }
  }

  if (shortestSoFar === undefined) {
    return compilationResult(language.name, lastError!);
  }

  globalWarnings.push(...shortestSoFar.warnings);

  const [result, finishingHist] = finish(
    shortestSoFar.program,
    (x: Error) => {
      globalWarnings.push(x);
    },
    shortestSoFar.startPhase
  );

  return compilationResult(
    language.name,
    result,
    mergeRepeatedPlugins([...shortestSoFar.history, ...finishingHist]),
    globalWarnings
  );
}

function mergeRepeatedPlugins(history: [number, string][]): [number, string][] {
  const result: [number, string][] = [];
  for (const [c, name] of history) {
    if (name === result.at(-1)?.[1]) {
      result[result.length - 1][0] += c;
    } else {
      result.push([c, name]);
    }
  }
  return result;
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
  const result = compileVariantNoPacking(
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
