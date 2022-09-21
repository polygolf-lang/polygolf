#!/usr/bin/env node

import lua from "./languages/lua";
// import debugEmit from "./languages/debug/emit";
import { applyLanguage } from "./common/applyLanguage";
import fibonacciSolution from "./programs/fibonacci";
import leapYearsSolution from "./programs/leap-years";
import nivenNumbersSolution from "./programs/niven-numbers";
import odiousNumbersSolution from "./programs/odious-numbers";
import daysOfChristmasSolution from "./programs/12-days-of-christmas";

console.log(applyLanguage(lua, fibonacciSolution));
console.log(applyLanguage(lua, leapYearsSolution));
console.log(applyLanguage(lua, nivenNumbersSolution));
console.log(applyLanguage(lua, odiousNumbersSolution));
console.log(applyLanguage(lua, daysOfChristmasSolution));
