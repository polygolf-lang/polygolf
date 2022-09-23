import { Path, Visitor } from "../common/traverse";
import { IR } from "../IR";

export function requireBlockWhen(nodeTypes: string[] = []): Visitor {
  return {
    exit(path: Path) {
      const node = path.node;
      if (node.type === "Block") {
        node.requiresBlock = hasBlockRequiringChild(path, nodeTypes);
      }
    },
  };
}

function hasBlockRequiringChild(
  path: Path<IR.Node>,
  nodeTypes: string[]
): boolean {
  for (const childPath of path.getChildPaths()) {
    const node = childPath.node;
    if (
      (nodeTypes.includes("blocks") &&
        ("consequent" in node || "children" in node)) ||
      nodeTypes.includes(node.type)
    ) {
      return true;
    }
  }
  return false;
}
