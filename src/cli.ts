#!/usr/bin/env node

import yargs from "yargs";
import fs from "fs";
import parse from "./frontend/parse";
import { applyLanguage } from "./common/applyLanguage";

import lua from "./languages/lua";
import nim from "./languages/nim";

const languageTable = { lua, nim };

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
  })
  .parseSync(process.argv.slice(2));

const lang = languageTable[options.lang];
const code = fs.readFileSync(options.input, { encoding: "utf-8" });
const prog = parse(code);
console.log(applyLanguage(lang, prog));
