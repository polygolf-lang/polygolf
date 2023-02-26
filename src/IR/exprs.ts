import { getArithmeticType } from "../common/getType";
import { stringify } from "../common/stringify";
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
  isCommutative,
  int,
  associativity,
  isBinary,
  stringLiteral,
  integerType,
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
}

export interface UnaryOp extends BaseExpr {
  readonly kind: "UnaryOp";
  readonly name: string;
  readonly op: UnaryOpCode;
  readonly arg: Expr;
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

function _polygolfOp(op: OpCode, ...args: Expr[]): PolygolfOp {
  return {
    kind: "PolygolfOp",
    op,
    args,
  };
}

export function polygolfOp(op: OpCode, ...args: Expr[]): Expr {
  if (op === "neg") {
    if (args[0].kind === "PolygolfOp" && args[0].op === "add")
      return _polygolfOp(
        "add",
        ...args[0].args.map((x) => polygolfOp("neg", x))
      );
    return polygolfOp("mul", int(-1), args[0]);
  }
  if (op === "sub") {
    return polygolfOp("add", args[0], polygolfOp("neg", args[1]));
  }
  if (isBinary(op) && associativity(op) === "both") {
    args = args.flatMap((x) =>
      x.kind === "PolygolfOp" && x.op === op ? x.args : [x]
    );
    if (op === "add") args = simplifyPolynomial(args);
    else {
      if (isCommutative(op)) {
        args.sort(compareTerms);
      }
      const newArgs: Expr[] = [];
      for (const arg of args) {
        if (newArgs.length > 0) {
          const combined = evalBinaryOp(op, newArgs[newArgs.length - 1], arg);
          if (combined !== null) {
            newArgs[newArgs.length - 1] = combined;
          } else {
            newArgs.push(arg);
          }
        } else newArgs.push(arg);
      }
      args = newArgs;
    }
    if (args.length === 1) return args[0];
  }
  return _polygolfOp(op, ...args);
}

function evalBinaryOp(op: BinaryOpCode, left: Expr, right: Expr): Expr | null {
  if (left.kind === "StringLiteral" && right.kind === "StringLiteral") {
    return stringLiteral(left.value + right.value);
  }
  if (left.kind === "IntegerLiteral" && right.kind === "IntegerLiteral") {
    return int(
      getArithmeticType(
        op,
        integerType(left.value, left.value),
        integerType(right.value, right.value)
      ).low as bigint
    );
  }
  return null;
}

/** Simplifies a polynomial represented as an array of terms. */
function simplifyPolynomial(terms: Expr[]): Expr[] {
  const coeffMap = new Map<string, [bigint, Expr]>();
  let constant = 0n;
  function add(coeff: bigint, rest: readonly Expr[]) {
    const stringified = rest.map(stringify).join("");
    if (coeffMap.has(stringified)) {
      const [oldCoeff, expr] = coeffMap.get(stringified)!;
      coeffMap.set(stringified, [oldCoeff + coeff, expr]);
    } else {
      coeffMap.set(stringified, [coeff, _polygolfOp("mul", ...rest)]);
    }
  }
  for (const x of terms) {
    if (x.kind === "IntegerLiteral") constant += x.value;
    else if (x.kind === "PolygolfOp" && x.op === "mul") {
      if (x.args[0].kind === "IntegerLiteral")
        add(x.args[0].value, x.args.slice(1));
      else add(1n, x.args);
    } else add(1n, [x]);
  }
  const result: Expr[] = [];
  for (const [coeff, expr] of coeffMap.values()) {
    if (coeff === 1n) result.push(expr);
    else if (coeff !== 0n) result.push(polygolfOp("mul", int(coeff), expr));
  }
  if (result.length < 0 || constant !== 0n) result.push(int(constant));
  return result;
}

function compareTerms(a: Expr, b: Expr): -1 | 0 | 1 {
  if (a.kind === "IntegerLiteral" && b.kind === "IntegerLiteral") return 0;
  if (a.kind === "IntegerLiteral") return -1;
  return 0;
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
  name: string = ""
): BinaryOp {
  return {
    kind: "BinaryOp",
    op,
    left,
    right,
    name,
  };
}

export function unaryOp(
  op: UnaryOpCode,
  arg: Expr,
  name: string = ""
): UnaryOp {
  return {
    kind: "UnaryOp",
    op,
    arg,
    name,
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

export function print(value: Expr, newline: boolean = true): Expr {
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
