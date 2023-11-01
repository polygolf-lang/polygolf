import type { Spine } from "../common/Spine";
import {
  type Assignment,
  type ManyToManyAssignment,
  type OneToManyAssignment,
  type VarDeclarationWithAssignment,
  type MutatingInfix,
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
  type Infix,
  type ConditionalOp,
  type FunctionCall,
  type MethodCall,
  type Prefix,
  type IndexCall,
  type KeyValue,
  type RangeIndexCall,
  type Function,
  type NamedArg,
  type ImplicitConversion,
  type PropertyCall,
  type Postfix,
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
  | MutatingInfix
  | IndexCall
  | RangeIndexCall
  | MethodCall
  | PropertyCall
  | Infix
  | Prefix
  | Postfix
  | ImportStatement
  | ForDifferenceRange
  | ForEach
  | ForEachKey
  | ForEachPair
  | ForCLike
  | NamedArg;

export type NodeFuncRecord<Tout, Tin extends Node = Node> = Tin extends Node
  ? Record<Tin["kind"], (n: Tin, s: Spine<Tin>) => Tout>
  : never;

export function getNodeFunc<Tout>(
  nodeMapRecord: NodeFuncRecord<Tout>,
): (n: Node, s: Spine) => Tout | undefined {
  function result(node: Node, spine: Spine): Tout | undefined {
    if (node.kind in nodeMapRecord) {
      return (nodeMapRecord[node.kind as keyof typeof nodeMapRecord] as any)(
        node,
        spine,
      );
    }
  }
  return result;
}
