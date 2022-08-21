import { IR } from "../../IR";

export default function emit(node: IR.Node): string {
  switch (node.type) {
    case "Program":
      return emit(node.block);
    case "Block":
      return (
        "{ " + node.children.map((stmt) => emit(stmt) + ";").join(" ") + " }"
      );
    case "WhileLoop":
      return `while ${emit(node.condition)} ` + emit(node.body);
    case "IfStatement":
      return (
        `if ${emit(node)} \n` +
        emit(node.consequent) +
        "\nelse\n" +
        emit(node.alternate) +
        "\nend"
      );
    case "Variants":
      return "[ " + node.variants.map(emit).join(" | ") + " ]";
    case "Assignment":
      return `${emit(node.variable)}=${emit(node.expr)}`;
    case "Application":
      return "(" + node.name + " " + node.args.map(emit).join(" ") + ")";
    case "Identifier":
      return node.name;
    case "StringLiteral":
      return JSON.stringify(node.value);
    case "IntegerLiteral":
      return node.value.toString();
    case "FunctionCall":
      return (
        node.func + "(" + node.args.map((arg) => emit(arg)).join(",") + ")"
      );
    case "MethodCall":
      return (
        node.object +
        ":" +
        node.method +
        "(" +
        node.args.map((arg) => emit(arg)).join(",") +
        ")"
      );
    case "BinaryOp":
      return emit(node.left) + node.op + emit(node.right);
    case "UnaryOp":
      return node.op + emit(node.arg);
    default:
      throw new Error(`Unimplemented node for debug: ${node.type}. `);
  }
}
