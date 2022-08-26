import { Path, programToPath } from "common/traverse";
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
import { Block, IfStatement, VarDeclaration, Variants } from "./toplevel";
import { simpleType, ValueType } from "./types";

export * from "./assignments";
export * from "./collections";
export * from "./exprs";
export * from "./loops";
export * from "./terminals";
export * from "./toplevel";
export * from "./types";

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
  const result: Program = {
    type: "Program",
    block,
    dependencies: new Set<string>(),
    variables: new Map<string, ValueType>(),
  };
  const path = programToPath(result);
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
