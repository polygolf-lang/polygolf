#!/usr/bin/env node

import yargs from "yargs";
import fs from "fs";
import path from "path";
import parse from "./frontend/parse";
import applyLanguage from "./common/applyLanguage";
import { PolygolfError } from "./common/errors";

import lua from "./languages/lua";
import nim from "./languages/nim";
import python from "./languages/python";
import polygolf from "./languages/polygolf";

const languageTable = { lua, nim, python, polygolf };

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
  })
  .parseSync(process.argv.slice(2));

const lang = languageTable[options.lang];
const code = fs.readFileSync(options.input, { encoding: "utf-8" });
const prog = parse(code);
try {
  const result = applyLanguage(lang, prog);
  if (options.output !== undefined) {
    fs.mkdirSync(path.dirname(options.output), { recursive: true });
    fs.writeFileSync(options.output, result);
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
  } else {
    throw e;
  }
}
