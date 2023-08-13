import parse from "frontend/parse";
import compile, { applyAll, debugEmit, normalize } from "@/common/compile";
import { findLang } from "@/languages/languages";
import { Plugin } from "@/common/Language";
import { getOnlyVariant } from "@/common/expandVariants";

export function testLang(
  name: string,
  lang: string,
  obj: "nogolf" | "bytes" | "chars",
  input: string,
  output: string
) {
  test(name, () =>
    expect(
      compile(
        input,
        {
          level: obj === "nogolf" ? "none" : "full",
          objective: obj === "chars" ? "chars" : "bytes",
          restrictFrontend: false,
        },
        findLang(lang)!
      )[0].result
    ).toEqual(output)
  );
}

export function testPlugin(
  name: string,
  plugin: Plugin,
  input: string,
  output: string
) {
  test(name, () =>
    expect(
      debugEmit(
        applyAll(
          getOnlyVariant(parse(input, false)),
          (x: Error) => {},
          {} as any,
          plugin.visit
        )
      )
    ).toEqual(normalize(output))
  );
}
