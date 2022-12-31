import {
  Expr,
  Identifier,
  BaseExpr,
  id,
  UnaryOpCode,
  BinaryOpCode,
  OpCode,
} from "./IR";

/**
 * All expressions start as a `PolygolfOp` node.
 * Plugins (mainly `mapOps, mapPrecedenceOps` plugins) then transform these to how they are represented in the target lang. (function, binary infix op, etc.)
 * This node should never enter the emit phase.
 */

export interface KeyValue extends BaseExpr {
  kind: "KeyValue";
  key: Expr;
  value: Expr;
}

export interface PolygolfOp extends BaseExpr {
  kind: "PolygolfOp";
  op: OpCode;
  args: Expr[];
}

export interface FunctionCall extends BaseExpr {
  kind: "FunctionCall";
  ident: Identifier;
  op: OpCode | null;
  args: Expr[];
}

export interface MethodCall extends BaseExpr {
  kind: "MethodCall";
  ident: Identifier;
  op: OpCode | null;
  object: Expr;
  args: Expr[];
  property: boolean;
}

export interface IndexCall extends BaseExpr {
  kind: "IndexCall";
  collection: Expr;
  index: Expr;
  op: OpCode | null;
  oneIndexed: boolean;
}

export interface RangeIndexCall extends BaseExpr {
  kind: "RangeIndexCall";
  collection: Expr;
  low: Expr;
  high: Expr;
  step: Expr;
  op: OpCode | null;
  oneIndexed: boolean;
}

export type LValue = Identifier | IndexCall;

export interface BinaryOp extends BaseExpr {
  kind: "BinaryOp";
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
  kind: "MutatingBinaryOp";
  op: BinaryOpCode;
  name: string;
  variable: LValue;
  right: Expr;
}

export interface UnaryOp extends BaseExpr {
  kind: "UnaryOp";
  name: string;
  op: UnaryOpCode;
  arg: Expr;
  precedence: number;
}

/**
 * Conditional ternary operator.
 *
 * Python: [alternate,consequent][condition] or consequent if condition else alternate
 * C: condition?consequent:alternate.
 */
export interface ConditionalOp extends BaseExpr {
  kind: "ConditionalOp";
  condition: Expr;
  consequent: Expr;
  alternate: Expr;
  isSafe: boolean; // whether both branches can be safely evaluated (without creating side effects or errors - allows for more golfing)
}

export interface Function extends BaseExpr {
  kind: "Function";
  args: Identifier[];
  expr: Expr;
}

export function keyValue(key: Expr, value: Expr): KeyValue {
  return {
    kind: "KeyValue",
    key,
    value,
  };
}

export function polygolfOp(op: OpCode, ...args: Expr[]): PolygolfOp {
  return {
    kind: "PolygolfOp",
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
    kind: "FunctionCall",
    ident: typeof ident === "string" ? id(ident, true) : ident,
    op: op === undefined ? null : op,
    args,
  };
}

export function methodCall(
  object: Expr,
  args: Expr[],
  ident: string | Identifier,
  op?: OpCode,
  property = false
): MethodCall {
  return {
    kind: "MethodCall",
    op: op === undefined ? null : op,
    ident: typeof ident === "string" ? id(ident, true) : ident,
    object,
    args,
    property,
  };
}

export function indexCall(
  collection: string | Expr,
  index: Expr,
  op?: OpCode,
  oneIndexed: boolean = false
): IndexCall {
  return {
    kind: "IndexCall",
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
    kind: "RangeIndexCall",
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
  precedence: number,
  rightAssociative?: boolean
): BinaryOp {
  return {
    kind: "BinaryOp",
    op,
    left,
    right,
    name,
    precedence,
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
    kind: "MutatingBinaryOp",
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
  precedence: number
): UnaryOp {
  return {
    kind: "UnaryOp",
    op,
    arg,
    name,
    precedence,
  };
}

export function conditional(
  condition: Expr,
  consequent: Expr,
  alternate: Expr,
  isSafe: boolean
): ConditionalOp {
  return {
    kind: "ConditionalOp",
    condition,
    consequent,
    alternate,
    isSafe,
  };
}

export function func(args: (string | Identifier)[], expr: Expr): Function {
  return {
    kind: "Function",
    args: args.map((x) => (typeof x === "string" ? id(x) : x)),
    expr,
  };
}

export function print(value: Expr, newline: boolean = true): PolygolfOp {
  return polygolfOp(newline ? "println" : "print", value);
}

export function getArgs(
  node:
    | PolygolfOp
    | BinaryOp
    | MutatingBinaryOp
    | UnaryOp
    | FunctionCall
    | MethodCall
    | IndexCall
    | RangeIndexCall
): Expr[] {
  switch (node.kind) {
    case "BinaryOp":
      return [node.left, node.right];
    case "MutatingBinaryOp":
      return [node.variable, node.right];
    case "UnaryOp":
      return [node.arg];
    case "FunctionCall":
      return node.args;
    case "MethodCall":
      return [node.object, ...node.args];
    case "PolygolfOp":
      return node.args;
    case "IndexCall":
      return [node.collection, node.index];
    case "RangeIndexCall":
      return [node.collection, node.low, node.high, node.step];
  }
}
