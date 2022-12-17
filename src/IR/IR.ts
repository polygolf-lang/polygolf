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
import { integerType, sub, Type } from "./types";

export * from "./assignments";
export * from "./opcodes";
export * from "./collections";
export * from "./exprs";
export * from "./loops";
export * from "./terminals";
export * from "./toplevel";
export * from "./types";

export interface BaseExpr extends BaseNode {
  type?: Type;
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
  kind: "Program";
  dependencies: Set<string>;
  variables: Map<string, Type>;
  body: Expr;
}

export function program(body: Expr): Program {
  return {
    kind: "Program",
    body,
    dependencies: new Set<string>(),
    variables: new Map<string, Type>(),
  };
}

export function typesPass(program: Program) {
  const path = programToPath(program);
  path.visit({
    name: "anonymous",
    enter(path: Path) {
      const node = path.node;
      function setVar(name: string, type: Type) {
        if (program.variables.has(name)) {
          throw new PolygolfError(
            `Duplicate variable declaration: ${name}!`,
            node.source
          );
        }
        program.variables.set(name, type);
      }
      if (node.kind === "ForRange") {
        const low = getType(node.low, path.root.node);
        const high = getType(node.high, path.root.node);
        const step = getType(node.increment, path.root.node);
        if (
          low.kind !== "integer" ||
          high.kind !== "integer" ||
          step.kind !== "integer"
        ) {
          throw new PolygolfError(
            `Unexpected for range type (${low.kind},${high.kind},${step.kind})`,
            node.source
          );
        }
        setVar(
          node.variable.name,
          integerType(low.low, sub(high.high, node.inclusive ? 0n : 1n))
        );
      } else if (node.kind === "ForEach") {
        setVar(
          node.variable.name,
          getCollectionTypes(node.collection, program)[0]
        );
      } else if (node.kind === "ForEachKey") {
        setVar(node.variable.name, getCollectionTypes(node.table, program)[0]);
      } else if (node.kind === "ForEachPair") {
        let types = getCollectionTypes(node.table, program);
        if (types.length === 1) {
          types = [integerType(), types[0]];
        }
        setVar(node.keyVariable.name, types[0]);
        setVar(node.valueVariable.name, types[1]);
      } else if (
        node.kind === "Assignment" &&
        node.variable.kind === "Identifier"
      ) {
        if (node.variable.type !== undefined)
          setVar(node.variable.name, node.variable.type);
        else {
          if (!program.variables.has(node.variable.name))
            setVar(node.variable.name, getType(node.expr, program));
        }
      }
    },
    exit(path: Path) {
      if (path.node.kind !== "Program" && path.node.kind !== "Block") {
        getType(path.node, program);
      }
    },
  });
}
