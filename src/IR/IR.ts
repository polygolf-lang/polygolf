import { getCollectionTypes, getType } from "../common/getType";
import { Path, programToPath } from "../common/traverse";
import {
  Assignment,
  ManyToManyAssignment,
  OneToManyAssignment,
  VarDeclarationWithAssignment,
} from "./assignments";
import { ArrayConstructor, ListConstructor } from "./collections";
import {
  PolygolfOp,
  BinaryOp,
  ConditionalOp,
  FunctionCall,
  MethodCall,
  MutatingBinaryOp,
  UnaryOp,
  IndexCall,
} from "./exprs";
import {
  ForRange,
  ForEach,
  ForEachKey,
  ForEachPair,
  ForCLike,
  WhileLoop,
} from "./loops";
import { Identifier, IntegerLiteral, StringLiteral } from "./terminals";
import {
  Block,
  IfStatement,
  ImportStatement,
  VarDeclaration,
  Variants,
} from "./toplevel";
import { integerType, ValueType } from "./types";

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
  | Variants
  | ImportStatement;

export type Expr =
  | PolygolfOp
  | VarDeclaration
  | VarDeclarationWithAssignment
  | Assignment
  | IndexCall
  | FunctionCall
  | MethodCall
  | BinaryOp
  | UnaryOp
  | Identifier
  | StringLiteral
  | IntegerLiteral
  | ArrayConstructor
  | ListConstructor
  | MutatingBinaryOp
  | ConditionalOp
  | ManyToManyAssignment
  | OneToManyAssignment
  | ImportStatement;

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
  function setVar(name: string, type: ValueType) {
    if (result.variables.has(name)) {
      throw new Error(`Duplicate variable declaration: ${name}`!);
    }
    result.variables.set(name, type);
  }
  path.visit({
    enter(path: Path) {
      const node = path.node;
      if (node.type === "ForRange") {
        const low = getType(node.low, path.root.node);
        const high = getType(node.high, path.root.node);
        if (low.type !== "integer" || high.type !== "integer") {
          throw new Error(`Unexpected type (${low.type},${high.type})`);
        }
        setVar(
          node.variable.name,
          integerType(
            low.low,
            high.high === undefined
              ? undefined
              : high.high - (node.inclusive ? 0n : -1n)
          )
        );
      } else if (node.type === "ForEach") {
        setVar(
          node.variable.name,
          getCollectionTypes(node.collection, result)[0]
        );
      } else if (node.type === "ForEachKey") {
        setVar(node.variable.name, getCollectionTypes(node.table, result)[0]);
      } else if (node.type === "ForEachPair") {
        let types = getCollectionTypes(node.table, result);
        if (types.length === 1) {
          types = [integerType(), types[0]];
        }
        setVar(node.keyVariable.name, types[0]);
        setVar(node.valueVariable.name, types[1]);
      } else if (node.type === "VarDeclaration") {
        result.variables.set(node.variable.name, node.variableType);
        path.replaceWithMultiple([]); // TODO does this work?
      }
    },
  });
  return result;
}
