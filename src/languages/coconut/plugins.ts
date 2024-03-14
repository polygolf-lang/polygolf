import type { CompilationContext } from "@/common/compile";
import { type Node, infix, isIdent, isInt } from "../../IR";

function isAllowedAsImplicitArg(node: Node): boolean {
  return (
    isIdent()(node) ||
    (node.kind === "PropertyCall" && isIdent()(node.object)) ||
    isInt()(node) ||
    (node.kind === "Infix" &&
      node.name === "**" &&
      isAllowedAsImplicitArg(node.args[0]) &&
      isInt()(node.args[1]))
  );
}

export function useImplicitFunctionCalls(node: Node) {
  if (node.kind === "FunctionCall") {
    if (node.args.length >= 1 && node.args.every(isAllowedAsImplicitArg)) {
      return infix(" ", node.func, ...(node.args as [Node, ...Node[]]));
    }
  }
}

export function useInfixFunctionCalls(node: Node) {
  if (
    node.kind === "FunctionCall" &&
    isIdent()(node.func) &&
    node.args.length === 2
  ) {
    return infix("`", node.args[0], node.func, node.args[1]);
  }
}

export function usePipesWhenChars(
  node: Node,
  _: unknown,
  context: CompilationContext,
) {
  if (context.options.objective !== "chars") {
    context.skipChildren();
    return;
  }
  if (node.kind === "FunctionCall" && node.args.length === 1) {
    return infix("|>", node.args[0], node.func);
  }
}
