import {
  type Assignment,
  type ManyToManyAssignment,
  type OneToManyAssignment,
  type VarDeclarationWithAssignment,
  type MutatingBinaryOp,
  type VarDeclaration,
  type VarDeclarationBlock,
} from "./assignments";
import {
  type ArrayConstructor,
  type ListConstructor,
  type TableConstructor,
  type SetConstructor,
} from "./collections";
import {
  type PolygolfOp,
  type BinaryOp,
  type ConditionalOp,
  type FunctionCall,
  type MethodCall,
  type UnaryOp,
  type IndexCall,
  type KeyValue,
  type RangeIndexCall,
  type Function,
  type NamedArg,
  type ImplicitConversion,
  type PropertyCall,
} from "./exprs";
import {
  type ForRange,
  type ForEach,
  type ForEachKey,
  type ForEachPair,
  type ForCLike,
  type WhileLoop,
  type ForArgv,
  type ForDifferenceRange,
} from "./loops";
import {
  type AnyIntegerLiteral,
  type Identifier,
  type IntegerLiteral,
  type TextLiteral,
} from "./terminals";
import {
  type Block,
  type IfStatement,
  type ImportStatement,
  type Variants,
} from "./toplevel";
import { type Type } from "./types";

export * from "./assignments";
export * from "./opcodes";
export * from "./collections";
export * from "./exprs";
export * from "./loops";
export * from "./terminals";
export * from "./toplevel";
export * from "./types";

export interface BaseNode {
  readonly source?: SourcePointer;
  /** type: an uninferrable type, either annotated from the frontend or
   * inserted for language-specific op nodes */
  readonly type?: Type;
}

export interface SourcePointer {
  readonly line: number;
  readonly column: number;
}

export type Node =
  // Frontend nodes
  | Block
  | Variants
  | KeyValue
  | Function
  | PolygolfOp
  | Assignment
  | FunctionCall
  | Identifier
  | TextLiteral
  | IntegerLiteral
  | AnyIntegerLiteral
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
