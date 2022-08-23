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
  Import,
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
  | Import
  | MutatingBinaryOp
  | ConditionalOp
  | ManyToManyAssignment
  | OneToManyAssignment;
