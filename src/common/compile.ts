import { isOp, op, isOpCode, type Type, type Node } from "../IR";
import { expandVariants } from "./expandVariants";
import {
  defaultDetokenizer,
  type Plugin,
  type Language,
  type TokenTree,
} from "./Language";
import { programToSpine, type Spine } from "./Spine";
import { getType, getTypeAndResolveOpCode } from "./getType";
import { stringify } from "./stringify";
import parse, { type ParseResult } from "../frontend/parse";
import { MinPriorityQueue } from "@datastructures-js/priority-queue";
import polygolfLanguage from "../languages/polygolf";
import {
  type Objective,
  type ObjectiveFunc,
  getObjectiveFunc,
  shorterBy,
} from "./objective";
import { readsFromArgv, readsFromStdin } from "./symbols";
import { PolygolfError } from "./errors";
import { charLength } from "./strings";
import { getOutput } from "../interpreter";

export type OptimisationLevel = "nogolf" | "simple" | "full";
export interface CompilationOptions {
  level: OptimisationLevel;
  objective: Objective | ObjectiveFunc;
  getAllVariants: boolean;
  skipTypecheck: boolean;
  restrictFrontend: boolean;
  codepointRange: [number, number];
  skipPlugins: string[];
  noEmit: boolean;
}

export function defaultCompilationOptions(
  partial: Partial<CompilationOptions> = {},
): CompilationOptions {
  return {
    level: partial.level ?? "full",
    objective: partial.objective ?? "bytes",
    getAllVariants: partial.getAllVariants ?? false,
    skipTypecheck: partial.skipTypecheck ?? false,
    restrictFrontend: partial.restrictFrontend ?? true,
    codepointRange: partial.codepointRange ?? [1, Infinity],
    skipPlugins: partial.skipPlugins ?? [],
    noEmit: partial.noEmit ?? false,
  };
}

export type AddWarning = (x: Error, isGlobal: boolean) => void;

export interface VisitorContext {
  skipReplacement: () => void; // Prevents recursion into a new node.
  skipChildren: () => void; // Prevents any recursion = into a new node or into children of old node.
}

export interface CompilationContext extends VisitorContext {
  options: CompilationOptions;
  addWarning: AddWarning;
}

export interface CompilationResult {
  language: string;
  result: string | Error;
  errors: Error[];
  history: [number, string][];
  warnings: Error[];
}

function compilationResult(
  language: string,
  result: string | Error,
  errors: Error[],
  history: [number, string][] = [],
  warnings: Error[] = [],
): CompilationResult {
  return {
    language,
    result,
    errors,
    history,
    warnings,
  };
}

export function applyAllToAllAndGetCounts(
  program: Node,
  options: CompilationOptions,
  addWarning: AddWarning,
  ...plugins: Plugin[]
): [Node, number[]] {
  const counts: number[] = [];
  let result = program;
  let c: number;
  for (const plugin of plugins) {
    [result, c] = applyToAllAndGetCount(result, options, addWarning, plugin);
    counts.push(c);
  }
  return [result, counts];
}

function getSingleOrUndefined<T>(x: T | T[] | undefined): T | undefined {
  if (Array.isArray(x)) {
    if (x.length > 1)
      throw new Error(
        `Programming error. Expected at most 1 item, but got ${stringify(x)}.`,
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
  options: CompilationOptions,
  addWarning: AddWarning,
  plugin: Plugin,
): [Node, number] {
  const result = programToSpine(program).withReplacer((n, s, ctx) => {
    const repl = getSingleOrUndefined(
      plugin.visit(n, s, { options, addWarning, ...ctx }),
    );
    return annotate(repl, s, plugin.bakeType === true);
  }).node;
  return [result, program === result ? 0 : 1]; // TODO it might be a bit more informative to count the actual replacements, intead of returning 1
}
function* applyToOne(
  spine: Spine,
  options: CompilationOptions,
  addWarning: AddWarning,
  plugin: Plugin,
) {
  for (const altPrograms of spine.compactMap((n, s, ctx) => {
    const suggestions = getArray(
      plugin.visit(n, s, { options, addWarning, ...ctx }),
    );
    return suggestions.map(
      (x) =>
        s.replacedWith(annotate(x, s, plugin.bakeType === true), true).root
          .node,
    );
  })) {
    yield* altPrograms;
  }
}

function emit(
  language: Language,
  program: Node,
  context: CompilationContext,
  noEmit: boolean,
) {
  let tokenTree: TokenTree;
  if (noEmit) {
    if (language.noEmitter !== undefined) {
      try {
        tokenTree = language.noEmitter(program, context);
      } catch {
        tokenTree = debugEmit(program);
      }
    } else {
      tokenTree = debugEmit(program);
    }
  } else {
    tokenTree = language.emitter(program, context);
  }
  return (language.detokenizer ?? defaultDetokenizer())(tokenTree);
}

function isError(x: any): x is Error {
  return x instanceof Error;
}

export default function compile(
  source: string,
  partialOptions: Partial<CompilationOptions>,
  ...languages: Language[]
): CompilationResult[] {
  const options = defaultCompilationOptions(partialOptions);
  const obj = getObjectiveFunc(options);
  let parsed: ParseResult;
  try {
    parsed = parse(source, options.restrictFrontend);
  } catch (e) {
    if (isError(e)) return [compilationResult("Polygolf", e, [e])];
  }
  const program = parsed!.node;
  let variants = expandVariants(program).map((x) => {
    try {
      x = typecheck(x, !options.skipTypecheck);
      return x;
    } catch (e) {
      if (isError(e)) return compilationResult("Polygolf", e, [e]);
      throw e;
    }
  });

  const errorlessVariants = variants.filter((x) => !("result" in x)) as Node[];
  const errorVariants = variants.filter(
    (x) => "result" in x,
  ) as CompilationResult[];
  if (errorlessVariants.length === 0) {
    for (const variant of variants) {
      (variant as CompilationResult).warnings = parsed!.warnings;
    }
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

  for (const res of result) {
    res.warnings.push(...parsed!.warnings);
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
  partialOptions: Partial<CompilationOptions>,
  language: Language,
): CompilationResult {
  const options = defaultCompilationOptions(partialOptions);
  if (options.level !== "nogolf")
    try {
      getOutput(program); // precompute output
    } catch {}
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
  partialOptions: Partial<CompilationOptions>,
  language: Language,
): CompilationResult {
  const options = defaultCompilationOptions(partialOptions);
  const phases = language.phases.map((x) => ({
    mode: x.mode,
    plugins: x.plugins.filter((x) => !options.skipPlugins.includes(x.name)),
  }));
  if (
    phases.length < 1 ||
    options.level === "nogolf" ||
    options.level === "simple"
  ) {
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
        options,
        addWarning,
        ...plugins,
      );
      return compilationResult(
        language.name,
        emit(
          language,
          res,
          {
            addWarning,
            options,
            skipChildren() {},
            skipReplacement() {},
          },
          options.noEmit,
        ),
        [],
        plugins.map((y, i) => [counts[i], y.name]),
        warnings,
      );
    } catch (e) {
      if (isError(e)) {
        return compilationResult(language.name, e, [e]);
      }
      throw e;
    }
  }
  const obj = getObjectiveFunc(options);
  function finish(
    prog: Node,
    addWarning: AddWarning,
    startPhase: number,
    noEmit: boolean,
  ): [string, [number, string][]] {
    const finishingPlugins = phases
      .slice(startPhase)
      .filter((x) => x.mode !== "search")
      .flatMap((x) => x.plugins);
    const [resProg, counts] = applyAllToAllAndGetCounts(
      prog,
      options,
      addWarning,
      ...finishingPlugins,
    );
    return [
      emit(
        language,
        resProg,
        {
          addWarning,
          options,
          skipChildren() {},
          skipReplacement() {},
        },
        noEmit,
      ),
      finishingPlugins.map((x, i) => [counts[i], x.name]),
    ];
  }
  let shortestSoFar: SearchState | undefined;
  const errors: Error[] = [];
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
    if (startPhase >= phases.length) return;
    if (latestPhaseWeSawTheProg.size > 200) return;
    const stringified = stringify(program);
    const latestSeen = latestPhaseWeSawTheProg.get(stringified);
    if (latestSeen === undefined || latestSeen < startPhase) {
      latestPhaseWeSawTheProg.set(stringified, startPhase);

      function addWarning(x: Error, isGlobal: boolean) {
        (isGlobal ? globalWarnings : warnings).push(x);
      }

      try {
        const length = obj(finish(program, addWarning, startPhase, false)[0]);
        const state = { program, startPhase, length, history, warnings };
        if (shortestSoFar === undefined || length < shortestSoFarLength) {
          shortestSoFarLength = length;
          shortestSoFar = state;
        }
        queue.enqueue(state);
      } catch (e) {
        if (isError(e)) {
          errors.push(e);
        }
      }
    }
  }

  enqueue(program, 0, [], []);

  while (!queue.isEmpty()) {
    const state = queue.dequeue();
    const phase = phases[state.startPhase];
    const warnings = [...state.warnings];

    function addWarning(x: Error, isGlobal: boolean) {
      (isGlobal ? globalWarnings : warnings).push(x);
    }

    if (phase.mode !== "search") {
      const [res, counts] = applyAllToAllAndGetCounts(
        state.program,
        options,
        addWarning,
        ...phase.plugins,
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
          options,
          addWarning,
          plugin,
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
    return compilationResult(language.name, errors.at(-1)!, errors);
  }

  globalWarnings.push(...shortestSoFar.warnings);

  const [result, finishingHist] = finish(
    shortestSoFar.program,
    (x: Error) => {
      globalWarnings.push(x);
    },
    shortestSoFar.startPhase,
    options.noEmit,
  );

  return compilationResult(
    language.name,
    result,
    errors,
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

function annotate<T extends Node | undefined>(
  node: T,
  sourceSpine: Spine,
  bakeType: boolean,
): T {
  if (node === undefined) return node;
  let type: Type | undefined;
  try {
    type = bakeType
      ? getType(sourceSpine.node, sourceSpine)
      : sourceSpine.node.type ?? node.type;
  } catch {}
  return {
    ...node,
    source: sourceSpine.node.source,
    type,
    targetType: node.targetType ?? sourceSpine.node.targetType,
  };
}

/** Typecheck a program and return a program with resolved opcodes.
 * If everyNode is false, typechecks only nodes neccesary to resolve opcodes, otherwise, typechecks every node. */
export function typecheck(program: Node, everyNode = true): Node {
  const spine = programToSpine(program);
  return spine.withReplacer(function (node, spine) {
    if (everyNode || (node.kind === "Op" && !isOpCode(node.op))) {
      const t = getTypeAndResolveOpCode(node, spine);
      if (isOp()(node) && t.opCode !== undefined) {
        return op.unsafe(t.opCode, ...node.args);
      }
    }
  }).node;
}

export function debugEmit(program: Node): string {
  const result = compileVariantNoPacking(
    program,
    {
      level: "nogolf",
      skipTypecheck: true,
      restrictFrontend: false,
    },
    polygolfLanguage,
  ).result;
  if (typeof result === "string") {
    return result;
  }
  throw result;
}

export function normalize(source: string): string {
  return debugEmit(parse(source, false).node);
}

export function isCompilable(program: Node, lang: Language) {
  const result = compileVariant(
    program,
    {
      level: "nogolf",
      restrictFrontend: false,
      skipTypecheck: true,
    },
    lang,
  );
  return typeof result.result === "string";
}
