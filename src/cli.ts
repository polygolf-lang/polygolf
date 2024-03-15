#!/usr/bin/env node

import yargs from "yargs";
import fs from "fs";
import path from "path";
import compile, { debugEmit } from "./common/compile";
import { NotImplementedError, UserError } from "./common/errors";
import languages, { findLang } from "./languages/languages";

const languageChoices = [
  ...new Set(languages.flatMap((x) => [x.name.toLowerCase(), x.extension])),
];

const options = yargs()
  .options({
    lang: {
      alias: "l",
      describe: "language to target",
      choices: languageChoices,
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
    all: {
      alias: "a",
      description: "Get all variants",
      type: "boolean",
    },
    debug: {
      alias: "d",
      description: "Print debug info, like history of applied plugins.",
      type: "boolean",
    },
  })
  .parseSync(process.argv.slice(2));

if (options.all === true && options.output !== undefined) {
  console.log(
    "All variants options is only allowed when the output file is not specified.",
  );
} else {
  const langs =
    options.lang === undefined ? languages : [findLang(options.lang)!];
  let input = options.input;
  if (!fs.existsSync(input)) input += ".polygolf";
  const code = fs.readFileSync(input, { encoding: "utf-8" });
  const printingMultipleLangs =
    langs.length > 1 && options.output === undefined;
  for (const result of compile(
    code,
    {
      objective: options.chars === true ? "chars" : "bytes",
      getAllVariants: options.all === true,
    },
    ...langs,
  )) {
    if (printingMultipleLangs) console.log(result.language);
    if (typeof result.result === "string") {
      if (options.output !== undefined) {
        fs.mkdirSync(path.dirname(options.output), { recursive: true });
        fs.writeFileSync(
          options.output +
            (langs.length > 1 || !options.output.includes(".")
              ? "." + findLang(result.language)!.extension
              : ""),
          result.result,
        );
      } else {
        console.log(result.result);
      }
      if (result.warnings.length > 0) {
        console.log("Warnings:");
        console.log(result.warnings.map((x) => x.message).join("\n"));
      }
      if (options.debug === true) {
        console.log("History:");
        console.log(
          result.history.map(([c, name]) => `${c} ${name}`).join("\n"),
        );

        if (result.errors.length > 0) {
          console.log("Errors:");
          console.log(
            result.errors
              .map(
                (e) =>
                  e.message +
                  (e instanceof NotImplementedError
                    ? "\n" + debugEmit(e.expr)
                    : ""),
              )
              .join("\n"),
          );
        }
      }
    } else {
      if (!printingMultipleLangs && langs.length > 1)
        console.log(result.language);
      handleError(result.result);
    }
    console.log("");
  }

  function handleError(e: unknown) {
    if (e instanceof UserError) {
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
            "^",
        );
      }
    } else {
      throw e;
    }
  }
}
