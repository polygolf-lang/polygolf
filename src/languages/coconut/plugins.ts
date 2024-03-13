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

export function usePipes(node: Node) {
  if (node.kind === "FunctionCall") {
    if (node.args.length === 1) {
      return infix("|>", node.args[0], node.func);
    }
  }
}
