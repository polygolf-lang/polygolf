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
    case "ForRange":
      return (
        `for ${emit(node.variable)} in range(${emit(node.low)},` +
        (node.inclusive ? "<=" : "<") +
        `${emit(node.high)},${emit(node.increment)}) ${emit(node.body)}`
      );
    case "ForEach":
      return (
        `foreach ${emit(node.variable)} in ${emit(node.collection)}` +
        emit(node.body)
      );
    case "ForEachPair":
      return (
        `foreach (${emit(node.keyVariable)},${emit(
          node.valueVariable
        )}) in  ${emit(node.table)}` + emit(node.body)
      );
    case "ForCLike":
      return (
        `for(${emit(node.init)};${emit(node.condition)};${emit(node.append)})` +
        emit(node.body)
      );
    case "ForEachKey":
      return (
        `foreach ${emit(node.variable)} in keys(${emit(node.table)})` +
        emit(node.body)
      );
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
    case "VarDeclaration":
      return `${emit(node.variable)}:${JSON.stringify(node.variableType)}`;
    case "Assignment":
      return `${emit(node.variable)}=${emit(node.expr)}`;
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
    case "Print":
      return (
        (node.newline ? "printnl" : "printnonl") + "(" + emit(node.value) + ")"
      );
    case "MethodCall":
      return (
        emit(node.object) +
        ":" +
        node.method +
        "(" +
        node.args.map((arg) => emit(arg)).join(",") +
        ")"
      );
    case "BinaryOp":
      return (
        "(" + emit(node.left) + " " + node.op + " " + emit(node.right) + ")"
      );
    case "UnaryOp":
      return "(" + node.op + " " + emit(node.arg) + ")";
    case "ArrayGet":
      return emit(node.array) + "[" + emit(node.index) + "]";
    default:
      throw new Error(`Unimplemented node for debug: ${node.type}. `);
  }
}
