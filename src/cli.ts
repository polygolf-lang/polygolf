#!/usr/bin/env node

import fs from "fs";
import parse from "./frontend/parse";
import path from "path";

import lua from "./languages/lua";
import nim from "./languages/nim";
import python from "./languages/python";
// import debugEmit from "./languages/debug/emit";
import { applyLanguage } from "./common/applyLanguage";

const programsDir = "src/programs";

const languages = { lua, nim, python };

const lang = languages.python;

for (const filename of fs.readdirSync(programsDir)) {
  if (!filename.endsWith(".polygolf")) continue;
  const filePath = path.join(programsDir, filename);
  console.log("\n#", filename);
  const code = fs.readFileSync(filePath, { encoding: "utf-8" });
  const prog = parse(code);
  // console.log(
  //   JSON.stringify(
  //     prog,
  //     (key, value) =>
  //       typeof value === "bigint" ? value.toString() + "n" : value,
  //     2
  //   )
  // );
  console.log(applyLanguage(lang, prog));
}
