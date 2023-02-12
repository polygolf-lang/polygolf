import { block, ImportStatement, importStatement } from "../../IR";

import { Plugin } from "../../common/Language";

const dependencyMap = new Map([["pow", "Foundation"]]);
export const addImports: Plugin = {
  name: "addImports",
  visit(program, spine) {
    if (program.kind !== "Program") return;
    // get dependencies
    // TODO: abstract this part for other languages
    // TODO: cache, and maybe do recursive merging for performance
    const dependenciesGen = spine.compactMap((node) => {
      let op: string = node.kind;
      if (node.kind === "BinaryOp" || node.kind === "UnaryOp") op = node.name;
      if (node.kind === "FunctionCall") op = node.ident.name;
      if (node.kind === "MethodCall") op = node.ident.name;
      if (dependencyMap.has(op)) {
        return dependencyMap.get(op)!;
      }
      if (node.kind === "TableConstructor") return "tables";
    });
    const dependencies = [...new Set(dependenciesGen)];
    if (dependencies.length < 1) return;
    // now actually apply dependencies
    const imports: ImportStatement = importStatement("import", dependencies);

    return {
      ...program,
      body:
        program.body.kind === "Block"
          ? block([imports, ...program.body.children])
          : block([imports, program.body]),
    };
  },
};
