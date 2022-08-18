#!/usr/bin/env node

import {
  Application,
  Assignment,
  Block,
  Identifier,
  IntegerLiteral,
  Program,
  WhileLoop,
} from "./types/IR";
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

const rawIR: Program = new Block([
  new Assignment("a", new IntegerLiteral(0n)),
  new Assignment("b", new IntegerLiteral(1n)),
  new Assignment("i", new IntegerLiteral(1n)),
  new WhileLoop(
    new Application("lt", [new Identifier("i"), new IntegerLiteral(32n)]),
    new Block([
      new Application("println", [new Identifier("a")]),
      new Assignment(
        "t",
        new Application("add", [new Identifier("a"), new Identifier("b")])
      ),
      new Assignment("b", new Identifier("a")),
      new Assignment("a", new Identifier("t")),
      new Assignment(
        "i",
        new Application("add", [new Identifier("i"), new IntegerLiteral(1n)])
      ),
    ])
  ),
]);
console.log(lua(rawIR));
