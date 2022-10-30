import * as loops from "./loops";
import { programToPath, Visitor } from "../common/traverse";
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

const loopProgram1 = program(
  block([
    forRange("i", int(0n), int(10n), int(1n), block([print(id("x"))]), false),
  ])
);

const loopProgram2 = program(
  block([
    forRange(
      "i",
      int(0n),
      polygolfOp("cardinality", id("collection")),
      int(1n),
      block([print(polygolfOp("array_get", id("collection"), id("i")))]),
      false
    ),
  ])
);

const loopProgram3 = program(
  block([
    forRange(
      "i",
      int(0n),
      polygolfOp("cardinality", id("collection")),
      int(1n),
      block([
        print(id("i")),
        print(polygolfOp("array_get", id("collection"), id("i"))),
      ]),
      false
    ),
  ])
);

function expectTransform(program: IR.Program, plugin: Visitor, output: string) {
  const programClone = structuredClone(program);
  const path = programToPath(programClone);
  path.visit(plugin);
  expect(debugEmit(programClone)).toEqual(output);
}

test("ForRange -> ForRangeInclusive", () =>
  expectTransform(
    loopProgram1,
    loops.forRangeToForRangeInclusive,
    "{ for i in range(0,<=sub(10,1),1) { println(x); }; }"
  ));
test("ForRange -> WhileLoop", () =>
  expectTransform(
    loopProgram1,
    loops.forRangeToWhile,
    "{ i:integer; i=0; while lt(i,10) { println(x); i=add(i,1); }; }"
  ));
test("ForRange -> ForCLike", () =>
  expectTransform(
    loopProgram1,
    loops.forRangeToForCLike,
    "{ for({ i:integer; i=0; };lt(i,10);{ add(i,1); }){ println(x); }; }"
  ));

test("ForRange -> ForEachPair", () =>
  expectTransform(
    loopProgram3,
    loops.forRangeToForEachPair,
    "{ foreach (i,a) in  collection{ println(i); println(a); }; }"
  ));
test("ForRange -> ForEach", () =>
  expectTransform(
    loopProgram2,
    loops.forRangeToForEach,
    "{ foreach a in collection{ println(a); }; }"
  ));
test("ForRange -> ForEach", () =>
  expectTransform(
    loopProgram3,
    loops.forRangeToForEach,
    "{ for i in range(0,<cardinality(collection),1) { println(i); println(array_get(collection,i)); }; }"
  ));
