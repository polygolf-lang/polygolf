import {
  Program,
  Expr,
  ValueType,
  listType,
  simpleType,
  arrayType,
} from "../IR";

function getType(expr: Expr, program: Program): ValueType {
  if (expr.valueType === undefined) {
    expr.valueType = calcType(expr, program);
  }
  return expr.valueType;
}

export function calcType(expr: Expr, program: Program): ValueType {
  switch (expr.type) {
    case "Argv":
      return listType("string");
    case "VarDeclaration":
      return simpleType("void");
    case "Assignment":
      return getType(expr.expr, program);
    case "Print":
      return simpleType("void");
    case "FunctionCall":
      return simpleType("void"); // TODO
    case "MethodCall":
      return simpleType("void"); // TODO
    case "BinaryOp":
      return simpleType("number"); // TODO
    case "UnaryOp":
      return simpleType("number"); // TODO
    case "Identifier":
      if (program.variables.has(expr.name)) {
        return program.variables.get(expr.name)!;
      }
      throw new Error(`Undeclared variable ${expr.name} encountered!`);
    case "StringLiteral":
      return simpleType("string");
    case "IntegerLiteral":
      return simpleType("number");
    case "ArrayConstructor":
      return arrayType(getType(expr.exprs[0], program), expr.exprs.length);
    case "ListConstructor":
      return listType(getType(expr.exprs[0], program));
    case "StringGetByte":
      return simpleType("string");
    case "TableGet": {
      const tableType = getType(expr.table, program);
      if (tableType.type !== "Table") {
        throw new Error("Type of TableGet must be used on a table");
      }
      return tableType.value;
    }
    case "TableSet":
      return simpleType("void");
    case "ArrayGet": {
      const arrType = getType(expr.array, program);
      if (arrType.type !== "Array") {
        throw new Error("Type of TableGet must be used on a table");
      }
      return arrType.member;
    }
    case "ArraySet":
      return simpleType("void");
    case "ListGet": {
      const listType = getType(expr.list, program);
      if (listType.type !== "List") {
        throw new Error("Type of TableGet must be used on a table");
      }
      return listType.member;
    }
    case "ListSet":
      return simpleType("void");
    case "ListPush":
      return simpleType("void");
    case "MutatingBinaryOp":
      return simpleType("void");
    case "ConditionalOp":
      return getType(expr.consequent, program);
    case "ManyToManyAssignment":
      return simpleType("void");
    case "OneToManyAssignment":
      return getType(expr.expr, program);
  }
}
