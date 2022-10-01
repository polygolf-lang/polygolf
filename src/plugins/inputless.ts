import { Path, Visitor } from "common/traverse";
import { block, print, stringLiteral, variants } from "IR";

export const hardcodeOutput: Visitor = {
  enter(path: Path) {
    const node = path.node;
    if (node.type === "Program" && !path.anyNode("Argv")) {
      const program = path.root.node;
      const output = "x"; // eval program
      program.block = block([
        variants([program.block, block([print(stringLiteral(output))])]),
      ]);
    }
  },
};
