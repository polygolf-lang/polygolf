import {
  Expr,
  Identifier,
  BaseExpr,
  id,
  UnaryOpCode,
  BinaryOpCode,
  OpCode,
  Node,
  IntegerLiteral,
  MutatingBinaryOp,
} from "./IR";

/**
 * All expressions start as a `PolygolfOp` node.
 * Plugins (mainly `mapOps, mapPrecedenceOps` plugins) then transform these to how they are represented in the target lang. (function, binary infix op, etc.)
 * This node should never enter the emit phase.
 */

export interface KeyValue extends BaseExpr {
  readonly kind: "KeyValue";
  readonly key: Expr;
  readonly value: Expr;
}

export interface PolygolfOp extends BaseExpr {
  readonly kind: "PolygolfOp";
  readonly op: OpCode;
  readonly args: readonly Expr[];
}

export interface FunctionCall extends BaseExpr {
  readonly kind: "FunctionCall";
  readonly ident: Identifier;
  readonly op: OpCode | null;
  readonly args: readonly Expr[];
}

export interface MethodCall extends BaseExpr {
  readonly kind: "MethodCall";
  readonly ident: Identifier;
  readonly op: OpCode | null;
  readonly object: Expr;
  readonly args: readonly Expr[];
  readonly property: boolean;
}

export interface IndexCall extends BaseExpr {
  readonly kind: "IndexCall";
  readonly collection: Expr;
  readonly index: Expr;
  readonly op: OpCode | null;
  readonly oneIndexed: boolean;
}

export interface RangeIndexCall extends BaseExpr {
  readonly kind: "RangeIndexCall";
  readonly collection: Expr;
  readonly low: Expr;
  readonly high: Expr;
  readonly step: Expr;
  readonly op: OpCode | null;
  readonly oneIndexed: boolean;
}

export interface BinaryOp extends BaseExpr {
  readonly kind: "BinaryOp";
  readonly op: BinaryOpCode;
  readonly name: string;
  readonly left: Expr;
  readonly right: Expr;
  readonly precedence: number;
  readonly rightAssociative: boolean;
}

export interface UnaryOp extends BaseExpr {
  readonly kind: "UnaryOp";
  readonly name: string;
  readonly op: UnaryOpCode;
  readonly arg: Expr;
  readonly precedence: number;
}

/**
 * Conditional ternary operator.
 *
 * Python: [alternate,consequent][condition] or consequent if condition else alternate
 * C: condition?consequent:alternate.
 */
export interface ConditionalOp extends BaseExpr {
  readonly kind: "ConditionalOp";
  readonly condition: Expr;
  readonly consequent: Expr;
  readonly alternate: Expr;
  readonly isSafe: boolean; // whether both branches can be safely evaluated (without creating side effects or errors - allows for more golfing)
}

export interface Function extends BaseExpr {
  readonly kind: "Function";
  readonly args: readonly Identifier[];
  readonly expr: Expr;
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
  args: readonly Expr[],
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
  args: readonly Expr[],
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
    rightAssociative: rightAssociative ?? (op === "pow" || op === "concat"),
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
): readonly Expr[] {
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

export function isIntLiteral(x: Node, val?: bigint): x is IntegerLiteral {
  if (x.kind === "IntegerLiteral") {
    return val === undefined || val === x.value;
  }
  return false;
}
