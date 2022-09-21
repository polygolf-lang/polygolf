#!/usr/bin/env node

import lua from "./languages/lua";
// import debugEmit from "./languages/debug/emit";
import { applyLanguage } from "./common/applyLanguage";
import fibonacciSolution from "./programs/fibonacci";
import leapYearsSolution from "./programs/leap-years";

console.log(applyLanguage(lua, fibonacciSolution));
console.log(applyLanguage(lua, leapYearsSolution));
