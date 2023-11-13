import parse from "../frontend/parse";
import compile, {
  type CompilationOptions,
  applyAllToAllAndGetCounts,
  debugEmit,
  normalize,
} from "../common/compile";
import { findLang } from "../languages/languages";
import { type Plugin } from "../common/Language";
import { getOnlyVariant } from "../common/expandVariants";

export const keywords = [
  "nogolf",
  "simple",
  "full",
  "bytes",
  "chars",
  "allVariants",
  "skipTypecheck",
  "typecheck",
  "restrictFrontend",
  "1..127",
  "32..127",
  "no:hardcode",
] as const;

export function compilationOptionsFromKeywords(
  args: string[],
  isLangTest = true,
): CompilationOptions {
  const is = (x: (typeof keywords)[number]) => args.includes(x);
  return {
    level: is("simple") ? "simple" : is("nogolf") ? "nogolf" : "full",
    objective: is("chars") ? "chars" : "bytes",
    codepointRange: is("1..127")
      ? [1, 127]
      : is("32..127")
      ? [32, 127]
      : [1, Infinity],
    getAllVariants: is("allVariants"),
    restrictFrontend: is("restrictFrontend"),
    skipTypecheck: isLangTest ? is("skipTypecheck") : !is("typecheck"),
    skipPlugins: is("no:hardcode") ? ["hardcode"] : [],
  };
}

export function testLang(
  name: string,
  lang: string,
  args: string[],
  input: string,
  output: string,
) {
  test(name, () => {
    expect(
      compile(
        input,
        compilationOptionsFromKeywords(args, true),
        findLang(lang)!,
      )[0].result,
    ).toEqual(output);
  });
}

export function testPlugin(
  name: string,
  plugins: Plugin[],
  args: string[],
  input: string,
  output: string,
) {
  test(name, () => {
    expect(
      debugEmit(
        applyAllToAllAndGetCounts(
          getOnlyVariant(parse(input, false)),
          {
            addWarning: () => {},
            options: compilationOptionsFromKeywords(args),
          },
          ...plugins.map((x) => x.visit),
        )[0],
      ),
    ).toEqual(normalize(output));
  });
}
