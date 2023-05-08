import {
  Assignment,
  ManyToManyAssignment,
  OneToManyAssignment,
  VarDeclarationWithAssignment,
  MutatingBinaryOp,
  VarDeclaration,
  VarDeclarationBlock,
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
  UnaryOp,
  IndexCall,
  KeyValue,
  RangeIndexCall,
  Function,
  NamedArg,
  ImplicitConversion,
  PropertyCall,
} from "./exprs";
import {
  ForRange,
  ForEach,
  ForEachKey,
  ForEachPair,
  ForCLike,
  WhileLoop,
  ForArgv,
  ForDifferenceRange,
} from "./loops";
import { Identifier, IntegerLiteral, StringLiteral } from "./terminals";
import { Block, IfStatement, ImportStatement, Variants } from "./toplevel";
import { Type } from "./types";

export * from "./assignments";
export * from "./opcodes";
export * from "./collections";
export * from "./exprs";
export * from "./loops";
export * from "./terminals";
export * from "./toplevel";
export * from "./types";

export interface BaseExpr extends BaseNode {
  /** type: an uninferrable type, either annotated from the frontend or
   * inserted for language-specific op nodes */
  readonly type?: Type;
}

export interface BaseNode {
  readonly source?: SourcePointer;
}

export interface SourcePointer {
  readonly line: number;
  readonly column: number;
}

export type Node = Program | Expr;

export type Expr =
  // Frontend nodes
  | Block
  | Variants
  | KeyValue
  | Function
  | PolygolfOp
  | Assignment
  | FunctionCall
  | Identifier
  | StringLiteral
  | IntegerLiteral
  | ArrayConstructor
  | ListConstructor
  | SetConstructor
  | TableConstructor
  | ConditionalOp
  | WhileLoop
  | ForRange
  | ForArgv
  | IfStatement
  // Other nodes
  | ImplicitConversion
  | VarDeclaration
  | VarDeclarationWithAssignment
  | VarDeclarationBlock
  | ManyToManyAssignment
  | OneToManyAssignment
  | MutatingBinaryOp
  | IndexCall
  | RangeIndexCall
  | MethodCall
  | PropertyCall
  | BinaryOp
  | UnaryOp
  | ImportStatement
  | ForDifferenceRange
  | ForEach
  | ForEachKey
  | ForEachPair
  | ForCLike
  | NamedArg;

/**
 * Program node. This should be the root node. Raw OK
 */
export interface Program extends BaseNode {
  readonly kind: "Program";
  readonly body: Expr;
}

export function program(body: Expr): Program {
  return {
    kind: "Program",
    body,
  };
}
