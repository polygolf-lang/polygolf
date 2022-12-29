import { IR } from "../IR";
import { expandVariants } from "./expandVariants";
import { Language, defaultDetokenizer, Plugin } from "./Language";
import { programToSpine } from "./Spine";
import polygolfLanguage from "../languages/polygolf";

export default function applyLanguage(
  language: Language,
  program: IR.Program
): string {
  return applyLanguageToVariants(
    language,
    language.name === "Polygolf" ? [program] : expandVariants(program)
  );
}

function getFinalEmit(language: Language) {
  const detokenizer = language.detokenizer ?? defaultDetokenizer();
  return (ir: IR.Program) => {
    let program = structuredClone(ir);
    language.emitPlugins
      .concat(language.finalEmitPlugins ?? [])
      .forEach((plugin) => {
        program = applyAll(program, plugin.visit);
      });
    return detokenizer(language.emitter(program));
  };
}

export const debugEmit = getFinalEmit(polygolfLanguage);

function applyAll(program: IR.Program, visitor: Plugin["visit"]) {
  return programToSpine(program).withReplacer(visitor).node as IR.Program;
}

function isError(x: any): x is Error {
  return x instanceof Error;
}

/** Return the emitted form of the shortest non-error-throwing variant, or
 * throw an error if every variant throws */
export function applyLanguageToVariants(
  language: Language,
  variants: IR.Program[]
): string {
  const finalEmit = getFinalEmit(language);
  const golfPlugins = language.golfPlugins.concat(language.emitPlugins);
  const ret = variants
    .map((variant) => golfProgram(variant, golfPlugins, finalEmit))
    .reduce((a, b) =>
      isError(a) ? b : isError(b) ? a : a.length < b.length ? a : b
    );
  // no variant could be compiled
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
  finalEmit: (ir: IR.Program) => string
): string | Error {
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
    const s = JSON.stringify(prog, (_, value) =>
      typeof value === "bigint" ? value.toString() + "n" : value
    );
    if (visited.has(s)) return;
    visited.add(s);
    try {
      const code = finalEmit(prog);
      if (code.length < shortestSoFar.length) shortestSoFar = code;
      // 200 is arbitrary limit for performance to stop the search, since we're
      // currently using naive BFS with no pruning.
      if (visited.size < 200) pq.push([prog, code.length, hist]);
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
        for (const altProgram of spine.visit((s) => {
          const ret = plugin.visit(s);
          if (ret !== undefined) return s.replacedWith(ret).root.node;
        })) {
          pushToQueue(altProgram, newHist);
        }
      }
    }
  }
  return shortestSoFar;
}
