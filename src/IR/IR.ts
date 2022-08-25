import { Path, programToPath } from "common/traverse";
import { table } from "console";
import path from "path";
import {
  Assignment,
  ManyToManyAssignment,
  OneToManyAssignment,
} from "./assignments";
import {
  ArrayGet,
  ArraySet,
  ArrayConstructor,
  ListConstructor,
  StringGetByte,
  ListGet,
  ListPush,
  ListSet,
  TableGet,
  TableSet,
  stringGetByte,
} from "./collections";
import {
  binaryOp,
  BinaryOp,
  ConditionalOp,
  FunctionCall,
  MethodCall,
  MutatingBinaryOp,
  Print,
  unaryOp,
  UnaryOp,
} from "./exprs";
import {
  ForRange,
  ForEach,
  ForEachKey,
  ForEachPair,
  ForCLike,
  WhileLoop,
} from "./loops";
import { Argv, Identifier, IntegerLiteral, StringLiteral } from "./terminals";
import { Block, IfStatement, VarDeclaration, Variants } from "./toplevel";

export * from "./assignments";
export * from "./collections";
export * from "./exprs";
export * from "./loops";
export * from "./terminals";
export * from "./toplevel";

export interface BaseExpr {
  valueType?: ValueType;
}

export type Node = Program | Block | Statement;

export type Statement =
  | Expr
  | WhileLoop
  | ForRange
  | ForEach
  | ForEachKey
  | ForEachPair
  | ForCLike
  | IfStatement
  | Variants;

export type Expr =
  | Argv
  | VarDeclaration
  | Assignment
  | Print
  | FunctionCall
  | MethodCall
  | BinaryOp
  | UnaryOp
  | Identifier
  | StringLiteral
  | IntegerLiteral
  | ArrayConstructor
  | ListConstructor
  | StringGetByte
  | TableGet
  | TableSet
  | ArrayGet
  | ArraySet
  | ListGet
  | ListSet
  | ListPush
  | MutatingBinaryOp
  | ConditionalOp
  | ManyToManyAssignment
  | OneToManyAssignment;

/** The type of the value of a node when evaluated */
export type ValueType =
  | { type: "void" }
  | { type: "number" }
  | { type: "string" }
  | { type: "boolean" }
  | { type: "List"; member: ValueType }
  | { type: "Table"; key: "number" | "string"; value: ValueType }
  | { type: "Array"; member: ValueType; length: number }
  | { type: "Set"; member: ValueType };

export function simpleType(
  type: "void" | "number" | "string" | "boolean"
): ValueType {
  return { type };
}
export function tableType(
  key: "number" | "string",
  value: ValueType | "void" | "number" | "string" | "boolean"
): ValueType {
  return {
    type: "Table",
    key,
    value: typeof value === "string" ? simpleType(value) : value,
  };
}
export function setType(
  member: ValueType | "void" | "number" | "string" | "boolean"
): ValueType {
  return {
    type: "Set",
    member: typeof member === "string" ? simpleType(member) : member,
  };
}
export function listType(
  member: ValueType | "void" | "number" | "string" | "boolean"
): ValueType {
  return {
    type: "List",
    member: typeof member === "string" ? simpleType(member) : member,
  };
}
export function arrayType(
  member: ValueType | "void" | "number" | "string" | "boolean",
  length: number
): ValueType {
  return {
    type: "Array",
    member: typeof member === "string" ? simpleType(member) : member,
    length,
  };
}

function getType(expr: Expr, program: Program): ValueType {
  if (expr.valueType === null) {
    expr.valueType = calcType(expr, program);
  }
  return expr.valueType!;
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
    case "TableGet":
      const tableT = getType(expr.table, program);
      if (tableT.type !== "Table") {
        throw new Error("Type of TableGet must be used on a table");
      }
      return tableT.value;
    case "TableSet":
      return simpleType("void");
    case "ArrayGet":
      const arrayT = getType(expr.array, program);
      if (arrayT.type !== "Array") {
        throw new Error("Type of TableGet must be used on a table");
      }
      return arrayT.member;
    case "ArraySet":
      return simpleType("void");
    case "ListGet":
      const listT = getType(expr.list, program);
      if (listT.type !== "List") {
        throw new Error("Type of TableGet must be used on a table");
      }
      return listT.member;
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

/**
 * Program node. This should be the root node. Raw OK
 */
export interface Program {
  type: "Program";
  dependencies: Set<string>;
  variables: Map<string, ValueType>;
  block: Block;
}

export function program(block: Block): Program {
  let result: Program = {
    type: "Program",
    block: block,
    dependencies: new Set<string>(),
    variables: new Map<string, ValueType>(),
  };
  let path = programToPath(result);
  path.visit({
    enter(path: Path) {
      const node = path.node;
      if (node.type === "ForRange") {
        result.variables.set(node.variable.name, simpleType("number"));
      } else if (node.type === "ForEach") {
        result.variables.set(node.variable.name, simpleType("number")); // TODO
      } else if (node.type === "ForEachKey") {
        result.variables.set(node.variable.name, simpleType("number")); // TODO
      } else if (node.type === "ForEachPair") {
        result.variables.set(node.valueVariable.name, simpleType("number")); // TODO
      } else if (node.type === "VarDeclaration") {
        result.variables.set(node.variable.name, node.variableType);
        path.replaceWithMultiple([]); // TODO does this work?
      }
    },
  });
  return result;
}
