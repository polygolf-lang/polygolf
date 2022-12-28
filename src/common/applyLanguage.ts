import { IR } from "../IR";
import { expandVariants } from "./expandVariants";
import { programToPath } from "./traverse";
import { Language, defaultDetokenizer, GolfPlugin } from "./Language";
import { programToSpine } from "./Spine";
import polygolfLanguage from "../languages/polygolf";

export default function applyLanguage(
  language: Language,
  program: IR.Program
): string {
  if (language.name === "Polygolf") {
    return applyLanguageToVariants(language, [program]);
  } else {
    const variants = expandVariants(program);
    return applyLanguageToVariants(language, variants);
  }
}

function getFinalEmit(language: Language) {
  const detokenizer = language.detokenizer ?? defaultDetokenizer();
  return (ir: IR.Program) => {
    let program = structuredClone(ir);
    language.emitPlugins.forEach((plugin) => {
      if (plugin.tag === "mutatingVisitor") {
        programToPath(program).visit(plugin);
      } else {
        program = applyAll(program, plugin.visit);
      }
    });
    return detokenizer(language.emitter(program));
  };
}

export const debugEmit = getFinalEmit(polygolfLanguage);

function applyAll(program: IR.Program, visitor: GolfPlugin["visit"]) {
  return programToSpine(program).withReplacer(visitor).node as IR.Program;
}

export function applyLanguageToVariants(
  language: Language,
  variants: IR.Program[]
): string {
  const finalEmit = getFinalEmit(language);
  const golfPlugins = language.golfPlugins;
  golfPlugins.push(
    ...(language.emitPlugins.filter((x) => x.tag === "golf") as GolfPlugin[])
  );
  return variants
    .map((variant) => golfProgram(variant, golfPlugins, finalEmit))
    .reduce((a, b) => (a.length < b.length ? a : b));
}

function golfProgram(
  program: IR.Program,
  golfPlugins: GolfPlugin[],
  finalEmit: (ir: IR.Program) => string
): string {
  const pq: [IR.Program, number, string[]][] = [];
  let shortestSoFar = finalEmit(program);
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
      pq.push([prog, code.length, hist]);
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
