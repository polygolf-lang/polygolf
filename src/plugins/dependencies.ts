import { Path } from "../common/traverse";

export function addDependencies(dependencyMap0: [string, string][]) {
  const dependencyMap = new Map<string, string>(dependencyMap0);
  return {
    enter(path: Path) {
      const node = path.node;
      let op: string = node.kind;
      if (node.kind === "BinaryOp" || node.kind === "UnaryOp") op = node.name;
      if (node.kind === "FunctionCall") op = node.ident.name;
      if (node.kind === "MethodCall") op = node.ident.name;
      if (dependencyMap.has(op)) {
        path.root.node.dependencies.add(dependencyMap.get(op)!);
      }
    },
  };
}
