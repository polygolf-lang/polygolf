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
import { type Array, type List, type Table, type Set } from "./collections";
import {
  type Op,
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
  type While,
  type ForArgv,
  type ForDifferenceRange,
} from "./loops";
import {
  type AnyInteger,
  type Identifier,
  type Integer,
  type Text,
} from "./terminals";
import { type Block, type If, type Import, type Variants } from "./toplevel";
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
  readonly targetType?: string;
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
  | Op
  | Assignment
  | FunctionCall
  | Identifier
  | Text
  | Integer
  | AnyInteger
  | Array
  | List
  | Set
  | Table
  | ConditionalOp
  | While
  | ForRange
  | ForArgv
  | If
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
  | Import
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
