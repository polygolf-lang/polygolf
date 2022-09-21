import * as loops from "./loops";
import { programToPath, Visitor } from "../common/traverse";
import {
  IR,
  arrayGet,
  block,
  forRange,
  id,
  int,
  program,
  unaryOp,
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
      unaryOp("cardinality", id("collection")),
      int(1n),
      block([print(arrayGet(id("collection"), id("i"), false))]),
      false
    ),
  ])
);

const loopProgram3 = program(
  block([
    forRange(
      "i",
      int(0n),
      unaryOp("cardinality", id("collection")),
      int(1n),
      block([
        print(id("i")),
        print(arrayGet(id("collection"), id("i"), false)),
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
    "{ for i in range(0,<=(10 sub 1),1) { printnl(x); }; }"
  ));
test("ForRange -> WhileLoop", () =>
  expectTransform(
    loopProgram1,
    loops.forRangeToWhile,
    "{ i:integer; i=0; while (i lt 10) { printnl(x); i=(i add 1); }; }"
  ));
test("ForRange -> ForCLike", () =>
  expectTransform(
    loopProgram1,
    loops.forRangeToForCLike,
    "{ for({ i:integer; i=0; };(i lt 10);{ (i add 1); }){ printnl(x); }; }"
  ));

test("ForRange -> ForEachPair", () =>
  expectTransform(
    loopProgram3,
    loops.forRangeToForEachPair,
    "{ foreach (i,a) in  collection{ printnl(i); printnl(a); }; }"
  ));
test("ForRange -> ForEach", () =>
  expectTransform(
    loopProgram2,
    loops.forRangeToForEach,
    "{ foreach a in collection{ printnl(a); }; }"
  ));
test("ForRange -> ForEach", () =>
  expectTransform(
    loopProgram3,
    loops.forRangeToForEach,
    "{ for i in range(0,<(cardinality collection),1) { printnl(i); printnl(collection[i]); }; }"
  ));
