#!/usr/bin/env node

import yargs from "yargs";
import fs from "fs";
import path from "path";
import parse from "./frontend/parse";
import applyLanguage, { searchOptions } from "./common/applyLanguage";
import { PolygolfError } from "./common/errors";
import languages, { findLang } from "./languages/languages";

const languageChoices = [
  ...new Set(languages.flatMap((x) => [x.name.toLowerCase(), x.extension])),
  "all",
];

const options = yargs()
  .options({
    lang: {
      alias: "l",
      describe: "language to target",
      choices: languageChoices,
      demandOption: true,
    },
    input: {
      alias: "i",
      describe: "input file",
      type: "string",
      demandOption: true,
    },
    output: {
      alias: "o",
      describe: "output file",
      type: "string",
    },
    chars: {
      alias: "c",
      description: "Use char length as objective",
      type: "boolean",
    },
  })
  .parseSync(process.argv.slice(2));

const langs = options.lang === "all" ? languages : [findLang(options.lang)!];
const code = fs.readFileSync(options.input, { encoding: "utf-8" });
try {
  const prog = parse(code);
  const printingMultipleLangs =
    langs.length > 1 && options.output === undefined;
  for (const lang of langs) {
    if (printingMultipleLangs) console.log(lang.name);
    try {
      const result = applyLanguage(
        lang,
        prog,
        searchOptions("full", options.chars === true ? "chars" : "bytes")
      );
      if (options.output !== undefined) {
        fs.mkdirSync(path.dirname(options.output), { recursive: true });
        fs.writeFileSync(
          options.output +
            (langs.length > 1 || !options.output.includes(".")
              ? "." + lang.extension
              : ""),
          result
        );
      } else {
        console.log(result);
      }
    } catch (e) {
      handleError(e);
    }
    if (printingMultipleLangs) console.log("");
  }
} catch (e) {
  handleError(e);
}

function handleError(e: unknown) {
  if (e instanceof PolygolfError) {
    console.log(e.message);
    if (e.source != null) {
      const startLine = e.source.line === 0 ? 0 : e.source.line - 2;
      console.log(
        code
          .split(/\r?\n/)
          .slice(startLine, e.source.line)
          .map((x, i) => `${startLine + i + 1}`.padStart(3, " ") + " " + x)
          .join("\n") +
          "\n" +
          " ".repeat(e.source.column + 3) +
          "^"
      );
    }
  } else {
    throw e;
  }
}
