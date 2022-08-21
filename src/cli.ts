#!/usr/bin/env node

import {
  application,
  assignment,
  block,
  id,
  int,
  program,
  variants,
  whileLoop,
} from "./IR/builders";
import lua from "./emitters/lua";
import debugEmit from "./emitters/debug/emit";
import { expandVariants } from "./IR/expandVariants";

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
        assignment("i", application("add", [id("i"), int(1n)])),
      ])
    ),
  ])
);
console.log(lua(rawIR));

// [ c; c1; | [ d; d1; | e; ]; ];
// [ f; | g; | h; i; ];
const variantsTest = program(
  block([
    variants([
      block([id("c"), id("c1")]),
      block([variants([block([id("d"), id("d1")]), block([id("e")])])]),
    ]),
    variants([block([id("f")]), block([id("g")]), block([id("h"), id("i")])]),
  ])
);

expandVariants(variantsTest).forEach((x) => console.log("\n" + debugEmit(x)));
