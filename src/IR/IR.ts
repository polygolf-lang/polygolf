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
export * from "./opcodes";
export * from "./collections";
export * from "./exprs";
export * from "./loops";
export * from "./terminals";
export * from "./toplevel";
export * from "./types";

export interface BaseExpr {
  valueType?: ValueType;
}

export type Node = Program | Block | Expr;

export type Expr =
  | Variants
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
  | ImportStatement
  | WhileLoop
  | ForRange
  | ForEach
  | ForEachKey
  | ForEachPair
  | ForCLike
  | IfStatement;

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
  return {
    type: "Program",
    block,
    dependencies: new Set<string>(),
    variables: new Map<string, ValueType>(),
  };
}

export function typesPass(program: Program) {
  function setVar(name: string, type: ValueType) {
    if (program.variables.has(name)) {
      throw new Error(`Duplicate variable declaration: ${name}`!);
    }
    program.variables.set(name, type);
  }
  const path = programToPath(program);
  path.visit({
    enter(path: Path) {
      const node = path.node;
      if (node.type === "ForRange") {
        const low = getType(node.low, path.root.node);
        const high = getType(node.high, path.root.node);
        const step = getType(node.increment, path.root.node);
        if (
          low.type !== "integer" ||
          high.type !== "integer" ||
          step.type !== "integer"
        ) {
          throw new Error(
            `Unexpected for range type (${low.type},${high.type},${step.type})`
          );
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
          getCollectionTypes(node.collection, program)[0]
        );
      } else if (node.type === "ForEachKey") {
        setVar(node.variable.name, getCollectionTypes(node.table, program)[0]);
      } else if (node.type === "ForEachPair") {
        let types = getCollectionTypes(node.table, program);
        if (types.length === 1) {
          types = [integerType(), types[0]];
        }
        setVar(node.keyVariable.name, types[0]);
        setVar(node.valueVariable.name, types[1]);
      } else if (
        node.type === "Assignment" &&
        node.variable.type === "Identifier"
      ) {
        const varType = node.variable.valueType ?? getType(node.expr, program);
        program.variables.set(node.variable.name, varType);
      } else if (
        node.type === "Identifier" &&
        !node.builtin &&
        !program.variables.has(node.name)
      ) {
        throw new Error(`Uninitialized variable ${node.name}!`);
      }
    },
  });
}
