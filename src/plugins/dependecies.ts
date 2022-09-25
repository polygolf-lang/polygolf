import { Path } from "../common/traverse";

export function addDependencies(dependencyMap0: [string, string][]) {
  const dependencyMap = new Map<string, string>(dependencyMap0);
  return {
    enter(path: Path) {
      const node = path.node;
      let op: string = node.type;
      if (node.type === "BinaryOp" || node.type === "UnaryOp") op = node.op;
      if (node.type === "FunctionCall") op = node.name;
      if (node.type === "MethodCall") op = node.name;
      if (dependencyMap.has(op)) {
        path.root.node.dependencies.add(dependencyMap.get(op)!);
      }
    },
  };
}
