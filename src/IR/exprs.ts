import {
  Expr,
  Identifier,
  BaseExpr,
  id,
  UnaryOpCode,
  BinaryOpCode,
  OpCode,
  getDefaultPrecedence,
} from "./IR";

/**
 * All expressions start as a `PolygolfOp` node.
 * Plugins (mainly `mapOps` plugin) then transform these to how they are represented in the target lang. (function, binary infix op, etc.)
 * This node should never enter the emit phase.
 */

export interface KeyValue extends BaseExpr {
  type: "KeyValue";
  key: Expr;
  value: Expr;
}

export interface PolygolfOp extends BaseExpr {
  type: "PolygolfOp";
  op: OpCode;
  args: Expr[];
}

export interface FunctionCall extends BaseExpr {
  type: "FunctionCall";
  ident: Identifier;
  op: OpCode | null;
  args: Expr[];
}

export interface MethodCall extends BaseExpr {
  type: "MethodCall";
  ident: Identifier;
  op: OpCode | null;
  object: Expr;
  args: Expr[];
}

export interface IndexCall extends BaseExpr {
  type: "IndexCall";
  collection: Expr;
  index: Expr;
  op: OpCode | null;
  oneIndexed: boolean;
}

export interface RangeIndexCall extends BaseExpr {
  type: "RangeIndexCall";
  collection: Expr;
  low: Expr;
  high: Expr;
  step: Expr;
  op: OpCode | null;
  oneIndexed: boolean;
}

export type LValue = Identifier | IndexCall;

export interface BinaryOp extends BaseExpr {
  type: "BinaryOp";
  op: BinaryOpCode;
  name: string;
  left: Expr;
  right: Expr;
  precedence: number;
  rightAssociative: boolean;
}

/**
 * Mutating operator.
 *
 * a += 5
 */
export interface MutatingBinaryOp extends BaseExpr {
  type: "MutatingBinaryOp";
  op: BinaryOpCode;
  name: string;
  variable: LValue;
  right: Expr;
}

export interface UnaryOp extends BaseExpr {
  type: "UnaryOp";
  name: string;
  op: UnaryOpCode;
  arg: Expr;
  precedence: number;
}

/**
 * Conditional ternary operator.
 *
 * Python: [alternate,consequent][condition].
 * C: condition?consequent:alternate.
 */
export interface ConditionalOp extends BaseExpr {
  type: "ConditionalOp";
  condition: Expr;
  consequent: Expr;
  alternate: Expr;
}

export function keyValue(key: Expr, value: Expr): KeyValue {
  return {
    type: "KeyValue",
    key,
    value,
  };
}

export function polygolfOp(op: OpCode, ...args: Expr[]): PolygolfOp {
  return {
    type: "PolygolfOp",
    op,
    args,
  };
}

export function functionCall(
  args: Expr[],
  ident: string | Identifier,
  op?: OpCode
): FunctionCall {
  return {
    type: "FunctionCall",
    ident: typeof ident === "string" ? id(ident, true) : ident,
    op: op === undefined ? null : op,
    args,
  };
}

export function methodCall(
  object: Expr,
  args: Expr[],
  ident: string | Identifier,
  op?: OpCode
): MethodCall {
  return {
    type: "MethodCall",
    op: op === undefined ? null : op,
    ident: typeof ident === "string" ? id(ident, true) : ident,
    object,
    args,
  };
}

export function indexCall(
  collection: string | Expr,
  index: Expr,
  op?: OpCode,
  oneIndexed: boolean = false
): IndexCall {
  return {
    type: "IndexCall",
    op: op === undefined ? null : op,
    collection: typeof collection === "string" ? id(collection) : collection,
    index,
    oneIndexed,
  };
}

export function rangeIndexCall(
  collection: string | Expr,
  low: Expr,
  high: Expr,
  step: Expr,
  op?: OpCode,
  oneIndexed: boolean = false
): RangeIndexCall {
  return {
    type: "RangeIndexCall",
    op: op === undefined ? null : op,
    collection: typeof collection === "string" ? id(collection) : collection,
    low,
    high,
    step,
    oneIndexed,
  };
}

export function binaryOp(
  op: BinaryOpCode,
  left: Expr,
  right: Expr,
  name: string = "",
  precedence?: number,
  rightAssociative?: boolean
): BinaryOp {
  return {
    type: "BinaryOp",
    op,
    left,
    right,
    name,
    precedence: precedence ?? getDefaultPrecedence(op),
    rightAssociative:
      rightAssociative ?? (op === "pow" || op === "text_concat"),
  };
}

export function mutatingBinaryOp(
  op: BinaryOpCode,
  variable: LValue,
  right: Expr,
  name: string = ""
): MutatingBinaryOp {
  return {
    type: "MutatingBinaryOp",
    op,
    variable,
    right,
    name,
  };
}

export function unaryOp(
  op: UnaryOpCode,
  arg: Expr,
  name: string = "",
  precedence?: number
): UnaryOp {
  return {
    type: "UnaryOp",
    op,
    arg,
    name,
    precedence: precedence ?? getDefaultPrecedence(op),
  };
}

export function print(value: Expr, newline: boolean = true): PolygolfOp {
  return polygolfOp(newline ? "println" : "print", value);
}
