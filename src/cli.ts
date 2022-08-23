#!/usr/bin/env node

import {
  assignment,
  binaryOp,
  block,
  forRange,
  id,
  int,
  mutatingBinaryOp,
  program,
  print,
  variants,
} from "./IR";
import { programToPath } from "./common/traverse";
import lua from "./languages/lua";
import debugEmit from "./languages/debug/emit";
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
    forRange(
      "i",
      int(0n),
      int(30n),
      int(1n),
      block([
        variants([
          block([
            assignment("t", binaryOp("add", id("a"), id("b"))),
            assignment("b", id("a")),
            assignment("a", id("t")),
            mutatingBinaryOp("add", id("i"), int(1n)),
          ]),
          block([
            mutatingBinaryOp("add", id("b"), id("a")),
            assignment("a", binaryOp("sub", id("b"), id("a"))),
          ]),
        ]),
      ]),
      true
    ),
  ])
);
console.log(applyLanguage(lua, rawIR));

const loopTest = program(
  block([
    forRange("i", int(0n), int(10n), int(1n), block([print(id("x"))]), false),
  ])
);

const path = programToPath(loopTest);
console.log(debugEmit(loopTest));
path.visit(forRangeToForRangeInclusive);
console.log(debugEmit(loopTest));
