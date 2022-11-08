import { IR, ValueType } from "../../IR";

export default function emit(node: IR.Node): string {
  switch (node.type) {
    case "Program":
      return emit(node.body);
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
        `foreach ${emit(node.variable)} in ${emit(node.collection)} ` +
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
        `for(${emit(node.init)};${emit(node.condition)};${emit(
          node.append
        )}) ` + emit(node.body)
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
        (node.alternate === undefined ? "" : emit(node.alternate)) +
        "\nend"
      );
    case "Variants":
      return "[ " + node.variants.map(emit).join(" | ") + " ]";
    case "VarDeclaration":
      return `${emit(node.variable)}:${emitType(node.variableType)}`;
    case "Assignment":
      return `${emit(node.variable)}=${emit(node.expr)}`;
    case "Identifier":
      return node.name;
    case "StringLiteral":
      return JSON.stringify(node.value);
    case "IntegerLiteral":
      return node.value.toString();
    case "PolygolfOp":
      return node.op + "(" + node.args.map((arg) => emit(arg)).join(",") + ")";
    case "FunctionCall":
      return (
        node.ident.name +
        "(" +
        node.args.map((arg) => emit(arg)).join(",") +
        ")"
      );
    case "MethodCall":
      return (
        emit(node.object) +
        ":" +
        node.ident.name +
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
    case "IndexCall":
      return emit(node.collection) + "[" + emit(node.index) + "]";
    default:
      throw new Error(`Unimplemented node for debug: ${node.type}. `);
  }
}

function emitType(t: ValueType): string {
  switch (t.type) {
    case "Array":
      return `Array(${emitType(t.member)}, ${t.length})`;
    case "List":
      return `List(${emitType(t.member)})`;
    case "Set":
      return `Set(${emitType(t.member)})`;
    case "Table":
      return `Table(${emitType(t.key)}, ${emitType(t.value)})`;
    default:
      return t.type;
  }
}
