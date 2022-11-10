import { PolygolfError } from "../common/errors";
import { getCollectionTypes, getType } from "../common/getType";
import { Path, programToPath } from "../common/traverse";
import {
  Assignment,
  ManyToManyAssignment,
  OneToManyAssignment,
  VarDeclarationWithAssignment,
} from "./assignments";
import {
  ArrayConstructor,
  ListConstructor,
  TableConstructor,
  SetConstructor,
} from "./collections";
import {
  PolygolfOp,
  BinaryOp,
  ConditionalOp,
  FunctionCall,
  MethodCall,
  MutatingBinaryOp,
  UnaryOp,
  IndexCall,
  KeyValue,
  RangeIndexCall,
  Function,
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

export interface BaseExpr extends BaseNode {
  valueType?: ValueType;
}

export interface BaseNode {
  source?: SourcePointer;
}

export interface SourcePointer {
  line: number;
  column: number;
}

export type Node = Program | Expr;

export type Expr =
  | Block
  | Variants
  | KeyValue
  | Function
  | PolygolfOp
  | VarDeclaration
  | VarDeclarationWithAssignment
  | Assignment
  | IndexCall
  | RangeIndexCall
  | FunctionCall
  | MethodCall
  | BinaryOp
  | UnaryOp
  | Identifier
  | StringLiteral
  | IntegerLiteral
  | ArrayConstructor
  | ListConstructor
  | SetConstructor
  | TableConstructor
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
export interface Program extends BaseNode {
  type: "Program";
  dependencies: Set<string>;
  variables: Map<string, ValueType>;
  body: Expr;
}

export function program(body: Expr): Program {
  return {
    type: "Program",
    body,
    dependencies: new Set<string>(),
    variables: new Map<string, ValueType>(),
  };
}

export function typesPass(program: Program) {
  const path = programToPath(program);
  path.visit({
    enter(path: Path) {
      const node = path.node;
      function setVar(name: string, type: ValueType) {
        if (program.variables.has(name)) {
          throw new PolygolfError(
            `Duplicate variable declaration: ${name}!`,
            node.source
          );
        }
        program.variables.set(name, type);
      }
      if (node.type === "ForRange") {
        const low = getType(node.low, path.root.node);
        const high = getType(node.high, path.root.node);
        const step = getType(node.increment, path.root.node);
        if (
          low.type !== "integer" ||
          high.type !== "integer" ||
          step.type !== "integer"
        ) {
          throw new PolygolfError(
            `Unexpected for range type (${low.type},${high.type},${step.type})`,
            node.source
          );
        }
        setVar(
          node.variable.name,
          integerType(
            low.low,
            high.high === undefined
              ? undefined
              : high.high - (node.inclusive ? 0n : 1n)
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
        if (node.variable.valueType !== undefined)
          setVar(node.variable.name, node.variable.valueType);
        else {
          if (!program.variables.has(node.variable.name))
            setVar(node.variable.name, getType(node.expr, program));
        }
      }
    },
    exit(path: Path) {
      if (path.node.type !== "Program" && path.node.type !== "Block") {
        getType(path.node, program);
      }
    },
  });
}
