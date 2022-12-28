import * as loops from "./loops";
import {
  IR,
  block,
  forRange,
  id,
  int,
  program,
  polygolfOp,
  print,
} from "../IR";
import debugEmit from "../languages/debug/emit";
import { Plugin } from "../common/Language";
import { programToSpine } from "../common/Spine";

const loopProgram1 = program(
  forRange("i", int(0n), int(10n), int(1n), print(id("x")), false)
);

const loopProgram2 = program(
  forRange(
    "i",
    int(0n),
    polygolfOp("list_length", id("collection")),
    int(1n),
    print(polygolfOp("list_get", id("collection"), id("i"))),
    false
  )
);

const loopProgram3 = program(
  forRange(
    "i",
    int(0n),
    polygolfOp("list_length", id("collection")),
    int(1n),
    block([
      print(id("i")),
      print(polygolfOp("list_get", id("collection"), id("i"))),
    ]),
    false
  )
);

function expectTransform(program: IR.Program, plugin: Plugin, output: string) {
  expect(
    debugEmit(programToSpine(program).withReplacer(plugin.visit).node)
  ).toEqual(output);
}

test("ForRange -> ForRangeInclusive", () =>
  expectTransform(
    loopProgram1,
    loops.forRangeToForRangeInclusive,
    "for i in range(0,<=sub(10,1),1) println(x)"
  ));
test("ForRange -> WhileLoop", () =>
  expectTransform(
    loopProgram1,
    loops.forRangeToWhile,
    "{ i=0; while lt(i,10) { println(x); i=add(i,1); }; }"
  ));
test("ForRange -> ForCLike", () =>
  expectTransform(
    loopProgram1,
    loops.forRangeToForCLike,
    "for(i=0;lt(i,10);i=add(i,1)) println(x)"
  ));

test("ForRange -> ForEachPair", () =>
  expectTransform(
    loopProgram3,
    loops.forRangeToForEachPair,
    "foreach (i,a) in  collection{ println(i); println(a); }"
  ));
test("ForRange -> ForEach", () =>
  expectTransform(
    loopProgram2,
    loops.forRangeToForEach,
    "foreach a in collection println(a)"
  ));
test("ForRange -> ForEach", () =>
  expectTransform(
    loopProgram3,
    loops.forRangeToForEach,
    "for i in range(0,<list_length(collection),1) { println(i); println(list_get(collection,i)); }"
  ));
