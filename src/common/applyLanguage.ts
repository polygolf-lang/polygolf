import { IR, typesPass } from "../IR";
import { expandVariants } from "./expandVariants";
import { programToPath, Visitor } from "./traverse";
import { Language, defaultDetokenizer, GolfPlugin } from "./Language";
import { programToSpine } from "./Spine";
import { Immutable } from "./immutable";

export default function applyLanguage(
  language: Language,
  program: IR.Program,
  skipTypesPass: boolean = false
): string {
  if (language.name === "Polygolf") {
    if (!skipTypesPass) {
      program = structuredClone(program);
      typesPass(program);
    }
    return applyLanguageToVariants(language, [program]);
  } else {
    const variants = expandVariants(program);
    if (!skipTypesPass)
      for (const variant of variants) {
        typesPass(variant);
      }
    return applyLanguageToVariants(language, variants);
  }
}

function getFinalEmit(language: Language) {
  const detokenizer = language.detokenizer ?? defaultDetokenizer();
  return (ir: IR.Program) =>
    detokenizer(
      language.emitter(
        language.emitPlugins.reduce((a, plugin) => {
          const clone = structuredClone(a);
          programToPath(clone).visit(plugin);
          return clone;
        }, ir)
      )
    );
}

export function applyLanguageToVariants(
  language: Language,
  variants: IR.Program[]
): string {
  const finalEmit = getFinalEmit(language);
  const golfPlugins: (GolfPlugin | Visitor)[] = language.golfPlugins;
  golfPlugins.push(
    ...language.emitPlugins.filter((x) => x.finalEmitOnly !== true)
  );
  return variants
    .map((variant) => golfProgram(variant, golfPlugins, finalEmit))
    .reduce((a, b) => (a.length < b.length ? a : b));
}

function golfProgram(
  program: IR.Program,
  golfPlugins: (GolfPlugin | Visitor)[],
  finalEmit: (ir: IR.Program) => string
): string {
  const pq: [Immutable<IR.Program>, number, string[]][] = [];
  let shortestSoFar = finalEmit(program);
  const visited = new Set<string>();
  const pushToQueue = (prog: IR.Program, hist: string[]) => {
    // cache based on JSON.stringify instead of finalEmit because
    //   1. finalEmit may error
    //   2. distinct program IRs can emit to the same target code (e.g
    //      `polygolfOp("+",a,b)` vs `functionCall("+",a,b)`)
    const s = JSON.stringify(prog, (key, value) =>
      key === "type"
        ? undefined
        : typeof value === "bigint"
        ? value.toString() + "n"
        : value
    );
    if (visited.has(s)) return;
    visited.add(s);
    const code = finalEmit(prog);
    // some logging helpful for debugging
    // console.log("\n=======\n" + code);
    // console.log("=======\n" + s);
    // console.log("=======\n" + getFinalEmit(polygolfLanguage(false))(program));
    if (code.length < shortestSoFar.length) shortestSoFar = code;
    pq.push([prog, code.length, hist]);
  };
  pushToQueue(program, []);
  // BFS over the full search space
  while (pq.length > 0) {
    const [program, , hist] = pq.shift()!;
    const spine = programToSpine(program);
    for (const plugin of golfPlugins) {
      const newHist = hist.concat([plugin.name]);
      if (plugin.tag === "golf") {
        for (const altProgram of spine.visit(plugin.visit)) {
          pushToQueue(altProgram, newHist);
        }
      } else {
        const prog = structuredClone(program) as IR.Program;
        programToPath(prog).visit(plugin);
        expandVariants(prog).forEach((p) => pushToQueue(p, newHist));
      }
    }
  }
  return shortestSoFar;
}
