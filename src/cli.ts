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
import { interpretToString } from "./interpreter/interpret";
import { expandVariants } from "./common/expandVariants";
import { IR } from "./IR";

const languageTable = { lua, nim, python, polygolf };

yargs()
  .command({
    command: ["compile", "*"],
    describe: "Compile one polygolf program to a language target",
    builder: {
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
    },
    handler: (opts) => {
      // TODO: yargs TS magic
      const options = {
        lang: opts.lang as keyof typeof languageTable,
        input: opts.input as string,
        output: opts.output as string | undefined,
      };
      const lang = languageTable[options.lang];
      withProgramFromFile(options.input, (prog) => {
        const result = applyLanguage(lang, prog);
        if (options.output !== undefined) {
          fs.mkdirSync(path.dirname(options.output), { recursive: true });
          fs.writeFileSync(options.output, result);
        } else {
          console.log(result);
        }
      });
    },
  })
  .command({
    command: ["run"],
    describe: "Run a polygolf program using the interpreter",
    builder: {
      input: {
        alias: "i",
        describe: "input file",
        type: "string",
        demandOption: true,
      },
      args: {
        describe: "arguments to pass to the program",
        type: "array",
      },
    },
    handler: (opts) => {
      // TODO: yargs TS magic
      const options = {
        input: opts.input as string,
        args: opts.args as string[] | undefined,
      };
      withProgramFromFile(options.input, (prog) => {
        expandVariants(prog).forEach((varProg) => {
          console.log(interpretToString(varProg, options.args ?? []));
        });
      });
    },
  })
  .demandCommand()
  .parseSync(process.argv.slice(2));

function withProgramFromFile(file: string, func: (prog: IR.Program) => void) {
  const code = fs.readFileSync(file, { encoding: "utf-8" });
  try {
    const prog = parse(code);
    func(prog);
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
      process.exit(1);
    } else {
      throw e;
    }
  }
}
