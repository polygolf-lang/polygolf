import { assignment, int } from "../../IR/builders";
import lua from ".";
import { IR, block, program } from "../../IR";

function expectTransform(program: IR.Program, output: string) {
  expect(lua(program)).toEqual(output);
}

test("Assignment", () =>
  expectTransform(program(block([assignment("b", int(1n))])), "b=1"));
