#!/usr/bin/env node

import lua from "./languages/lua";
import nim from "./languages/nim";
// import debugEmit from "./languages/debug/emit";
import { applyLanguage } from "./common/applyLanguage";
import fibonacciSolution from "./programs/fibonacci";
import leapYearsSolution from "./programs/leap-years";
import nivenNumbersSolution from "./programs/niven-numbers";
import odiousNumbersSolution from "./programs/odious-numbers";
import daysOfChristmasSolution from "./programs/12-days-of-christmas";
import christmasTreesSolution from "./programs/christmas-trees";

const testPrograms = [
  fibonacciSolution,
  leapYearsSolution,
  nivenNumbersSolution,
  odiousNumbersSolution,
  daysOfChristmasSolution,
  christmasTreesSolution,
];
const languages = { lua, nim };

const lang = languages.nim;

for (const prog of testPrograms) {
  console.log(applyLanguage(lang, prog));
  console.log();
}
