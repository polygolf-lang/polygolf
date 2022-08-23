import * as loops from "./loops";
import { programToPath, Visitor } from "../common/traverse";
import {
  IR,
  application,
  arrayGet,
  block,
  forRange,
  id,
  int,
  program,
} from "../IR";
import debugEmit from "../languages/debug/emit";

const loopProgram1 = program(
  block([
    forRange(
      "i",
      int(0n),
      int(10n),
      int(1n),
      block([application("print", [id("x")])]),
      false
    ),
  ])
);

const loopProgram2 = program(
  block([
    forRange(
      "i",
      int(0n),
      application("cardinality", [id("collection")]),
      int(1n),
      block([application("print", [arrayGet(id("collection"), id("i"))])]),
      false
    ),
  ])
);

const loopProgram3 = program(
  block([
    forRange(
      "i",
      int(0n),
      application("cardinality", [id("collection")]),
      int(1n),
      block([
        application("print", [id("i")]),
        application("print", [arrayGet(id("collection"), id("i"))]),
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
    "{ for i in range(0,<=(10 sub 1),1) { (print x); }; }"
  ));
test("ForRange -> WhileLoop", () =>
  expectTransform(
    loopProgram1,
    loops.forRangeToWhile,
    '{ i:"number"; i=0; while (i lt 10) { (print x); i=(i add 1); }; }'
  ));
test("ForRange -> ForCLike", () =>
  expectTransform(
    loopProgram1,
    loops.forRangeToForCLike,
    '{ for({ i:"number"; i=0; };(i lt 10);{ (i add 1); }){ (print x); }; }'
  ));

test("ForRange -> ForEachPair", () =>
  expectTransform(
    loopProgram3,
    loops.forRangeToForEachPair,
    "{ foreach (i,a) in  collection{ (print i); (print a); }; }"
  ));
test("ForRange -> ForEach", () =>
  expectTransform(
    loopProgram2,
    loops.forRangeToForEach,
    "{ foreach a in collection{ (print a); }; }"
  ));
test("ForRange -> ForEach", () =>
  expectTransform(
    loopProgram3,
    loops.forRangeToForEach,
    "{ for i in range(0,<(cardinality collection),1) { (print i); (print collection[i]); }; }"
  ));
