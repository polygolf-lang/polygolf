import { Path, Visitor } from "common/traverse";
import { block, print, stringLiteral, variants } from "IR";

export const hardcodeOutput: Visitor = {
  name: "hardcodeOutput",
  generatesVariants: true,
  enter(path: Path) {
    const node = path.node;
    if (node.kind === "Program" && !path.anyNode("Argv")) {
      const program = path.root.node;
      const output = "x"; // eval program
      program.body = variants([
        program.body,
        block([print(stringLiteral(output))]),
      ]);
    }
  },
};
