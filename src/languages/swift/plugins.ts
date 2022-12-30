import {
    block,
    ImportStatement,
    importStatement,
    Program,
  } from "../../IR";
  import { Path, Visitor } from "../../common/traverse";
  import { getType } from "../../common/getType";

export const addImports: Visitor = {
    name: "addImports",
    enterProgram(program: Program) {
      const dependencies = [...program.dependencies];
      if (dependencies.length < 1) return;
      let imports: ImportStatement;
      imports ??= importStatement("import", dependencies);
      program.body =
        program.body.kind === "Block"
          ? block([imports, ...program.body.children])
          : block([imports, program.body]);
    },
  };