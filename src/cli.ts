#!/usr/bin/env node

import {
  application,
  assignment,
  block,
  forRange,
  id,
  int,
  mutatingBinaryOp,
  program,
  variants,
  whileLoop,
} from "./IR/builders";
import { programToPath } from"./IR/traverse";
import lua from "./languages/lua";
import debugEmit from "./languages/debug/emit";
import { expandVariants } from "./IR/expandVariants";
import { applyLanguage } from "./common/applyLanguage";
import { forRangeToForRangeInclusive } from "./plugins/loops";

// hardcode input for now

// a = 0
// b = 1
// i = 1
// while (< i 32) {
//   (println a)
//   t = (add a b)
//   b = a
//   a = t
// }

const rawIR = program(
  block([
    assignment("a", int(0n)),
    assignment("b", int(1n)),
    assignment("i", int(1n)),
    whileLoop(
      application("lt", [id("i"), int(32n)]),
      block([
        application("println", [id("a")]),
        assignment("t", application("add", [id("a"), id("b")])),
        assignment("b", id("a")),
        assignment("a", id("t")),
        mutatingBinaryOp("add", id("i"), int(1n)),
      ])
    ),
  ])
);
console.log(applyLanguage(lua, rawIR));

const loopTest = program(
  block([
    forRange(
      "i",
      int(0n),
      int(10n),
      int(1n),
      block([application("print", [id("x")])])
    ),
  ])
);

const path = programToPath(loopTest);
console.log(debugEmit(loopTest));
path.visit(forRangeToForRangeInclusive);
console.log(debugEmit(loopTest));
