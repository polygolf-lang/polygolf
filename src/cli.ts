#!/usr/bin/env node

import fs from "fs";
import parse from "./frontend/parse";
import path from "path";

import lua from "./languages/lua";
import nim from "./languages/nim";
// import debugEmit from "./languages/debug/emit";
import { applyLanguage } from "./common/applyLanguage";

const programsDir = "src/programs";

const languages = { lua, nim };

const lang = languages.nim;

// for (const filename of fs.readdirSync(programsDir)) {
for (const filename of ["fibonacci.polygolf"]) {
  if (!filename.endsWith(".polygolf")) continue;
  const filePath = path.join(programsDir, filename);
  console.log("\nprocessing", filename);
  const code = fs.readFileSync(filePath, { encoding: "utf-8" });
  const prog = parse(code);
  console.log(JSON.stringify(prog, null, 2));
  // console.log(applyLanguage(lang, prog));
}
