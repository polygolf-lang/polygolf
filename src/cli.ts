#!/usr/bin/env node

import {
  application,
  assignment,
  block,
  id,
  int,
  program,
  whileLoop,
} from "./IR/builders";
import lua from "./emitters/lua";

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
