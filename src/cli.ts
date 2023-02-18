#!/usr/bin/env node

import yargs from "yargs";
import fs from "fs";
import path from "path";
import parse from "./frontend/parse";
import applyLanguage, { searchOptions } from "./common/applyLanguage";
import { PolygolfError } from "./common/errors";

import lua from "./languages/lua";
import nim from "./languages/nim";
import python from "./languages/python";
import polygolf from "./languages/polygolf";
import swift from "./languages/swift";
import golfscript from "./languages/golfscript";
import languages from "./languages/languages";

const languageTable = {
  golfscript,
  lua,
  nim,
  python,
  polygolf,
  swift,
  all: "all",
};

const options = yargs()
  .options({
    lang: {
      alias: "l",
      describe: "language to target",
      choices: Object.keys(languageTable) as (keyof typeof languageTable)[],
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

const langs =
  options.lang === "all" ? languages : [languageTable[options.lang]];
const code = fs.readFileSync(options.input, { encoding: "utf-8" });
const prog = parse(code);
for (const lang of langs) {
  if (langs.length > 1) console.log(lang.name);
  try {
    const result = applyLanguage(
      lang,
      prog,
      searchOptions("full", options.chars === true ? "chars" : "bytes")
    );
    if (options.output !== undefined) {
      fs.mkdirSync(path.dirname(options.output), { recursive: true });
      fs.writeFileSync(options.output + "." + lang.extension, result);
    } else {
      console.log(result);
    }
  } catch (e) {
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
    } else if (e instanceof Error && e.message.includes("No variant")) {
      // #130 will remove the need for this as emiters will throw a PolygolfError
      console.log(e.message);
    } else {
      throw e;
    }
  }
  if (langs.length > 1) console.log("");
}
