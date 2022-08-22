import * as loops from "./loops";
import { IR, programToPath, Visitor } from "../IR";
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
} from "../IR/builders";
import debugEmit from "../languages/debug/emit";

const loopProgram1 = program(
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

const loopProgram2 = program(
  block([
    forRange(
      "i",
      int(0n),
      application("cardinality", [id("collection")]),
      int(1n),
      block([
        application("print", [
          application("array_get", [id("collection"), id("i")]),
        ]),
      ])
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
        application("print", [
          id("i")
        ]),
        application("print", [
          application("array_get", [id("collection"), id("i")]),
        ]),
      ])
    ),
  ])
);

function expectTransform(program: IR.Program, plugin: Visitor, output: string) {
  var programClone = structuredClone(program);
  var path = programToPath(programClone);
  path.visit(plugin);
  expect(debugEmit(programClone)).toEqual(output);
}

test("ForRange -> ForRangeInclusive", () =>
  expectTransform(loopProgram1, loops.forRangeToForRangeInclusive, "{ for i in range(0,(10sub1),1) { (print x); }; }"));
test("ForRange -> WhileLoop", () =>
  expectTransform(loopProgram1, loops.forRangeToWhile, "{ i:\"number\"; i=0; while (ilt10) { (print x); i=(iadd1); }; }"));
test("ForRange -> ForCLike", () =>
  expectTransform(loopProgram1, loops.forRangeToForCLike, "{ for({ i:\"number\"; i=0; };(ilt10);{ (iadd1); }){ (print x); }; }"));

test("ForRange -> ForEachPair", () =>
  expectTransform(loopProgram3, loops.forRangeToForEachPair, "{ foreach (i,a) in  collection{ (print i); (print a); }; }"));
test("ForRange -> ForEach", () =>
  expectTransform(loopProgram2, loops.forRangeToForEach, "{ foreach a in collection{ (print a); }; }"));
test("ForRange -> ForEach", () =>
  expectTransform(loopProgram3, loops.forRangeToForEach, "{ for i in range(0,<(cardinality collection),1) { (print i); (print (array_get collection i)); }; }"));