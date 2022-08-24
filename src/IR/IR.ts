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
  StringGet,
  ListGet,
  ListPush,
  ListSet,
  TableGet,
  TableSet,
} from "./collections";
import {
  BinaryOp,
  ConditionalOp,
  FunctionCall,
  MethodCall,
  MutatingBinaryOp,
  Print,
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
import {
  Block,
  IfStatement,
  Program,
  VarDeclaration,
  Variants,
} from "./toplevel";

export * from "./assignments";
export * from "./collections";
export * from "./exprs";
export * from "./loops";
export * from "./terminals";
export * from "./toplevel";

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
  | StringGet
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
