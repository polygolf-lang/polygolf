import { type Node } from "../IR";
import { expandVariants } from "./expandVariants";
import { defaultDetokenizer, type Plugin, type Language } from "./Language";
import { programToSpine, type Spine } from "./Spine";
import { getType } from "./getType";
import { stringify } from "./stringify";
import parse from "../frontend/parse";
import { MinPriorityQueue } from "@datastructures-js/priority-queue";
import polygolfLanguage from "../languages/polygolf";
import {
  type Objective,
  type ObjectiveFunc,
  charLength,
  getObjectiveFunc,
  shorterBy,
} from "./objective";
import { readsFromArgv, readsFromStdin } from "./symbols";
import { PolygolfError } from "./errors";

export type OptimisationLevel = "nogolf" | "simple" | "full";
export interface CompilationOptions {
  level: OptimisationLevel;
  objective: Objective | ObjectiveFunc;
  getAllVariants: boolean;
  skipTypecheck: boolean;
  restrictFrontend: boolean;
  codepointRange: [number, number];
}

export function compilationOptions(
  partial: Partial<CompilationOptions> = {},
): CompilationOptions {
  return {
    level: partial.level ?? "full",
    objective: partial.objective ?? "bytes",
    getAllVariants: partial.getAllVariants ?? false,
    skipTypecheck: partial.skipTypecheck ?? false,
    restrictFrontend: partial.restrictFrontend ?? true,
    codepointRange: partial.codepointRange ?? [1, Infinity],
  };
}

export type AddWarning = (x: Error, isGlobal: boolean) => void;

export interface CompilationContext {
  options: CompilationOptions;
  addWarning: AddWarning;
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
  warnings: Error[] = [],
): CompilationResult {
  return {
    language,
    result,
    history,
    warnings,
  };
}

export function applyAllToAllAndGetCounts(
  program: Node,
  context: CompilationContext,
  ...visitors: Plugin["visit"][]
): [Node, number[]] {
  const counts: number[] = [];
  let result = program;
  let c: number;
  for (const visitor of visitors) {
    [result, c] = applyToAllAndGetCount(result, context, visitor);
    counts.push(c);
  }
  return [result, counts];
}

function getSingleOrUndefined<T>(x: T | T[] | undefined): T | undefined {
  if (Array.isArray(x)) {
    if (x.length > 1)
      throw new Error(
        `Programming error. Expected at most 1 item, but got ${JSON.stringify(
          x,
        )}.`,
      );
    return x[0];
  }
  return x;
}

function getArray<T>(x: T | T[] | undefined): T[] {
  if (Array.isArray(x)) {
    return x;
  }
  return x === undefined ? [] : [x];
}

export function applyToAllAndGetCount(
  program: Node,
  context: CompilationContext,
  visitor: Plugin["visit"],
): [Node, number] {
  const result = programToSpine(program).withReplacer((n, s) => {
    const repl = getSingleOrUndefined(visitor(n, s, context));
    return repl === undefined
      ? undefined
      : copySource(n, copyTypeAnnotation(n, repl));
  }).node;
  return [result, program === result ? 0 : 1]; // TODO it might be a bit more informative to count the actual replacements, intead of returning 1
}
function* applyToOne(
  spine: Spine,
  context: CompilationContext,
  visitor: Plugin["visit"],
) {
  for (const altPrograms of spine.compactMap((n, s) => {
    const suggestions = getArray(visitor(n, s, context));
    return suggestions.map(
      (x) =>
        s.replacedWith(copySource(n, copyTypeAnnotation(n, x)), true).root.node,
    );
  })) {
    yield* altPrograms;
  }
}

function emit(language: Language, program: Node, context: CompilationContext) {
  return (language.detokenizer ?? defaultDetokenizer())(
    language.emitter(program, context),
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
  let program: Node;
  try {
    program = parse(source, options.restrictFrontend);
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

  const errorlessVariants = variants.filter((x) => !("result" in x)) as Node[];
  const errorVariants = variants.filter(
    (x) => "result" in x,
  ) as CompilationResult[];
  if (errorlessVariants.length === 0) {
    if (options.getAllVariants) {
      return variants as CompilationResult[];
    } else {
      return [variants[0] as CompilationResult];
    }
  }
  if (!options.getAllVariants) {
    variants = errorlessVariants;
  }

  const result: CompilationResult[] = [];

  const variantsByInput = getVariantsByInputMethod(errorlessVariants);
  for (const language of languages) {
    if (options.getAllVariants) {
      const outputs = errorlessVariants.map((x) =>
        compileVariant(x, options, language),
      );
      result.push(...outputs);
    } else {
      const outputs = variantsByInput
        .get(language.readsFromStdinOnCodeDotGolf === true)!
        .map((x) => compileVariant(x, options, language));
      const res = outputs.reduce(shorterBy(obj));
      if (isError(res.result) && variants.length > 1)
        res.result.message =
          "No variant could be compiled: " + res.result.message;
      result.push(res);
    }
  }

  if (options.getAllVariants) {
    result.push(...errorVariants);
  }
  if (result.length < 0 && errorVariants.length > 0) {
    result.push(errorVariants[0]);
  }

  return result;
}

function getVariantsByInputMethod(variants: Node[]): Map<boolean, Node[]> {
  const variantsWithMethods = variants.map((variant) => {
    const spine = programToSpine(variant);
    return {
      variant,
      readsFromArgv: spine.someNode(readsFromArgv),
      readsFromStdin: spine.someNode(readsFromStdin),
    };
  });
  if (variantsWithMethods.some((x) => x.readsFromArgv && x.readsFromStdin)) {
    throw new PolygolfError("Program cannot read from both argv and stdin.");
  }
  return new Map<boolean, Node[]>(
    [true, false].map((preferStdin) => {
      const matching = variantsWithMethods.filter(
        (x) =>
          (preferStdin && !x.readsFromArgv) ||
          (!preferStdin && !x.readsFromStdin),
      );
      if (matching.length > 0)
        return [preferStdin, matching.map((x) => x.variant)];
      return [preferStdin, variants];
    }),
  );
}

export function compileVariant(
  program: Node,
  options: CompilationOptions,
  language: Language,
): CompilationResult {
  const obj = getObjectiveFunc(options);
  let best = compileVariantNoPacking(program, options, language);
  const packers = language.packers ?? [];
  if (
    options.objective !== "chars" ||
    packers.length < 1 ||
    isError(best.result)
  )
    return best;

  for (const packer of packers) {
    const bestForPacking = compileVariantNoPacking(
      program,
      {
        ...options,
        codepointRange: packer.codepointRange,
        objective: (x) => (x === null ? Infinity : charLength(packer.pack(x))),
      },
      language,
    );
    if (isError(bestForPacking.result)) continue;
    if (
      [...bestForPacking.result]
        .map((x) => x.charCodeAt(0))
        .some(
          (x) => x < packer.codepointRange[0] || x > packer.codepointRange[1],
        )
    )
      continue;
    const packed = packer.pack(bestForPacking.result);
    if (packed != null && obj(packed) < obj(best.result as string)) {
      best = { ...bestForPacking, result: packed };
    }
  }
  return best;
}

interface SearchState {
  program: Node;
  startPhase: number;
  length: number;
  warnings: Error[];
  history: [number, string][];
}

export function compileVariantNoPacking(
  program: Node,
  options: CompilationOptions,
  language: Language,
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
            : (x) => x.mode !== "search",
        )
        .flatMap((x) => x.plugins);
      const [res, counts] = applyAllToAllAndGetCounts(
        program,
        { addWarning, options },
        ...plugins.map((x) => x.visit),
      );
      return compilationResult(
        language.name,
        emit(language, res, { addWarning, options }),
        plugins.map((y, i) => [counts[i], y.name]),
        warnings,
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
    prog: Node,
    addWarning: AddWarning,
    startPhase = 0,
  ): [string, [number, string][]] {
    const finishingPlugins = phases
      .slice(startPhase)
      .filter((x) => x.mode !== "search")
      .flatMap((x) => x.plugins);
    const [resProg, counts] = applyAllToAllAndGetCounts(
      prog,
      { addWarning, options },
      ...finishingPlugins.map((x) => x.visit),
    );
    return [
      emit(language, resProg, { addWarning, options }),
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
    program: Node,
    startPhase: number,
    history: [number, string][],
    warnings: Error[],
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
        if (shortestSoFar === undefined || length < shortestSoFarLength) {
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
        { addWarning, options },
        ...phase.plugins.map((x) => x.visit),
      );
      enqueue(
        res,
        state.startPhase + 1,
        [
          ...state.history,
          ...phase.plugins.map(
            (x, i) => [counts[i], x.name] satisfies [number, string],
          ),
        ],
        warnings,
      );
    } else {
      enqueue(state.program, state.startPhase + 1, state.history, warnings);
      const spine = programToSpine(state.program);
      for (const plugin of phase.plugins) {
        for (const altProgram of applyToOne(
          spine,
          { addWarning, options },
          plugin.visit,
        )) {
          enqueue(
            altProgram,
            state.startPhase,
            [...state.history, [1, plugin.name]],
            warnings,
          );
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
    shortestSoFar.startPhase,
  );

  return compilationResult(
    language.name,
    result,
    mergeRepeatedPlugins([...shortestSoFar.history, ...finishingHist]),
    globalWarnings,
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
  return from.type !== undefined ? { ...to, type: from.type } : to;
}

function copySource(from: Node, to: Node): Node {
  // copy source reference if present
  return { ...to, source: from.source };
}

/** Typecheck a program by asking all nodes about their types.
 * Throws an error on a type error; otherwise is a no-op. */
function typecheck(program: Node) {
  const spine = programToSpine(program);
  spine.everyNode((x) => {
    getType(x, program);
    return true;
  });
}

export function debugEmit(program: Node): string {
  const result = compileVariantNoPacking(
    program,
    compilationOptions({
      level: "nogolf",
      skipTypecheck: true,
      restrictFrontend: false,
    }),
    polygolfLanguage,
  ).result;
  if (typeof result === "string") {
    return result;
  }
  throw result;
}

export function normalize(source: string): string {
  return debugEmit(parse(source, false));
}

export function isCompilable(program: Node, lang: Language) {
  const result = compileVariant(
    program,
    compilationOptions({
      level: "nogolf",
      restrictFrontend: false,
      skipTypecheck: true,
    }),
    lang,
  );
  return typeof result.result === "string";
}
