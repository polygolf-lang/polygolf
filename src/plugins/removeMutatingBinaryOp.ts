import { application, assignment, IR, Path, programToPath } from "../IR";

export default {
  enter(path: Path) {
    const node = path.node;
    if (node.type === "MutatingBinaryOp") {
      path.replaceWith(
        assignment(
          node.variable,
          application(node.op, [node.variable, node.right])
        )
      );
    }
  },
};
