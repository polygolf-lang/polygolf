import { assignment, Assignment, block, Program, id } from "../../IR";
import { Visitor } from "../../common/traverse";

export const addImports: Visitor = {
  name: "addImports",
  enterProgram(program: Program) {
    const dependencies = [...program.dependencies];
    if (dependencies.length < 1) return;
    let imports: Assignment = assignment(dependencies[0], id("", true));
    program.body =
      program.body.kind === "Block"
        ? block([imports, ...program.body.children])
        : block([imports, program.body]);
  },
};
