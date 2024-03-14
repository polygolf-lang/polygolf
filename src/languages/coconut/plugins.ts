import type { CompilationContext } from "@/common/compile";
import { type Node, infix, isIdent, isInt } from "../../IR";

function isAllowedAsImplicitArg(node: Node): boolean {
  return (
    isIdent()(node) ||
    (node.kind === "PropertyCall" && isIdent()(node.object)) ||
    isInt()(node) ||
    (node.kind === "Infix" &&
      node.name === "**" &&
      isAllowedAsImplicitArg(node.left))
  );
}

export function useImplicitFunctionApplications(node: Node) {
  if (node.kind === "FunctionCall") {
    if (node.args.every(isAllowedAsImplicitArg)) {
      return infix(
        " ",
        node.func,
        node.args.reduceRight((b, a) => infix(" ", a, b)),
      );
    }
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
  if (node.kind === "FunctionCall") {
    if (node.args.length === 1) {
      return infix("|>", node.args[0], node.func);
    }
  }
}
