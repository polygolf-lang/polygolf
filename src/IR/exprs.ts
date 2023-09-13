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
  isAssociative,
  text,
  integerType,
  AliasedOpCode,
  FrontendOpCode,
  AssociativeOpCode,
  CommutativeOpCode,
  isConstantType,
  isBinary,
  booleanNotOpCode,
  TextLiteral,
} from "./IR";

export interface ImplicitConversion extends BaseExpr {
  readonly kind: "ImplicitConversion";
  expr: Expr;
  behavesLike: UnaryOpCode & `${string}_to_${string}`;
}

/**
 * All expressions start as a `PolygolfOp` node.
 * This node is used to represent an abstract operation.
 * Plugins (mainly `mapOps, mapToUnaryAndBinaryOps` plugins) then transform these to how they are represented in the target lang. (function, binary infix op, etc.)
 * This node should never enter the emit phase.
 
* Polygolf ensures that in the IR, there will never be:

 * - PolygolfOp(neg)
 * - PolygolfOp(sub)
 * - PolygolfOp as a direct child of a PolygolfOp with the same associative OpCode
 * - IntegerLiteral as a nonfirst child of a commutative PolygolfOp
 * - Boolean negation of a boolean negation
 * - Boolean negation of an op that has a negated counterpart
 * 
 * This is ensured when using the polygolfOp contructor function and the Spine API so avoid creating such nodes manually.
 */
export interface PolygolfOp<Op extends OpCode = OpCode> extends BaseExpr {
  readonly kind: "PolygolfOp";
  readonly op: Op;
  readonly args: readonly Expr[];
}

export interface KeyValue extends BaseExpr {
  readonly kind: "KeyValue";
  readonly key: Expr;
  readonly value: Expr;
}

export interface FunctionCall extends BaseExpr {
  readonly kind: "FunctionCall";
  readonly func: Expr;
  readonly args: readonly Expr[];
}

export interface MethodCall extends BaseExpr {
  readonly kind: "MethodCall";
  readonly object: Expr;
  readonly ident: Identifier;
  readonly args: readonly Expr[];
}

export interface PropertyCall extends BaseExpr {
  readonly kind: "PropertyCall";
  readonly object: Expr;
  readonly ident: Identifier;
}

export interface IndexCall extends BaseExpr {
  readonly kind: "IndexCall";
  readonly collection: Expr;
  readonly index: Expr;
  readonly oneIndexed: boolean;
}

export interface RangeIndexCall extends BaseExpr {
  readonly kind: "RangeIndexCall";
  readonly collection: Expr;
  readonly low: Expr;
  readonly high: Expr;
  readonly step: Expr;
  readonly oneIndexed: boolean;
}

export interface BinaryOp extends BaseExpr {
  readonly kind: "BinaryOp";
  readonly name: string;
  readonly left: Expr;
  readonly right: Expr;
}

export interface UnaryOp extends BaseExpr {
  readonly kind: "UnaryOp";
  readonly name: string;
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
  readonly args: readonly Expr[];
  readonly expr: Expr;
}

export interface NamedArg<T extends Expr = Expr> extends BaseExpr {
  readonly kind: "NamedArg";
  readonly name: string;
  readonly value: T;
}

export function implicitConversion(
  behavesLike: UnaryOpCode & `${string}_to_${string}`,
  expr: Expr
): ImplicitConversion {
  return {
    kind: "ImplicitConversion",
    expr,
    behavesLike,
  };
}

export function keyValue(key: Expr, value: Expr): KeyValue {
  return {
    kind: "KeyValue",
    key,
    value,
  };
}

/**
 * This assumes that the construction will not break the invariants described
 * on `PolygolfOp` interface and hence is made private.
 */
function _polygolfOp(op: OpCode, ...args: Expr[]): PolygolfOp {
  return {
    kind: "PolygolfOp",
    op,
    args,
  };
}

export function polygolfOp(op: OpCode, ...args: Expr[]): Expr {
  if (op === "not" || op === "bit_not") {
    const arg = args[0];
    if (isPolygolfOp(arg)) {
      if (arg.op === op) return arg.args[0];
      if (op === "not") {
        const negated = booleanNotOpCode(arg.op as BinaryOpCode);
        if (negated != null) {
          return polygolfOp(negated, arg.args[0], arg.args[1]);
        }
      }
    }
  }
  if (op === "neg") {
    if (isIntLiteral(args[0])) {
      return int(-args[0].value);
    }
    return polygolfOp("mul", int(-1), args[0]);
  }
  if (op === "sub") {
    return polygolfOp("add", args[0], polygolfOp("neg", args[1]));
  }
  if (isAssociative(op)) {
    args = args.flatMap((x) => (isPolygolfOp(x, op) ? x.args : [x]));
    if (op === "add") args = simplifyPolynomial(args);
    else {
      if (isCommutative(op)) {
        args = args
          .filter((x) => isIntLiteral(x))
          .concat(args.filter((x) => !isIntLiteral(x)));
      } else {
        args = args.filter((x) => !isTextLiteral(x, ""));
        if (
          args.length === 0 ||
          (args.length === 1 && args[0].kind === "ImplicitConversion")
        ) {
          args = [text(""), args[0]];
        }
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
      if (op === "mul" && args.length > 1 && isNegativeLiteral(args[0])) {
        const toNegate = args.find(
          (x) => isPolygolfOp(x, "add") && x.args.some(isNegative)
        );
        if (toNegate !== undefined) {
          args = args.map((x) =>
            isIntLiteral(x)
              ? int(-x.value)
              : x === toNegate
              ? polygolfOp(
                  "add",
                  ...(x as PolygolfOp).args.map((y) => polygolfOp("neg", y))
                )
              : x
          );
        }
      }
    }
    if (
      op === "mul" &&
      args.length > 1 &&
      isIntLiteral(args[0], 1n) &&
      args[1].kind !== "ImplicitConversion"
    ) {
      args = args.slice(1);
    }

    if (args.length === 1) return args[0];
  }
  if (isBinary(op) && args.length === 2) {
    const combined = evalBinaryOp(op, args[0], args[1]);
    if (
      combined !== null &&
      (!isIntLiteral(combined) ||
        op !== "pow" || // only eval pow if it is a low number
        (combined.value < 10000 && combined.value > -10000))
    ) {
      return combined;
    }
  }
  return _polygolfOp(op, ...args);
}

function evalBinaryOp(op: BinaryOpCode, left: Expr, right: Expr): Expr | null {
  if (op === "concat" && isTextLiteral(left) && isTextLiteral(right)) {
    return text(left.value + right.value);
  }
  if (isIntLiteral(left) && isIntLiteral(right)) {
    try {
      const type = getArithmeticType(
        op,
        integerType(left.value, left.value),
        integerType(right.value, right.value)
      );
      if (isConstantType(type)) return int(type.low);
    } catch {
      // The output type is not an integer.
    }
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
      if (rest.length === 1) coeffMap.set(stringified, [coeff, rest[0]]);
      else coeffMap.set(stringified, [coeff, _polygolfOp("mul", ...rest)]);
    }
  }
  for (const x of terms) {
    if (isIntLiteral(x)) constant += x.value;
    else if (isPolygolfOp(x, "mul")) {
      if (isIntLiteral(x.args[0])) add(x.args[0].value, x.args.slice(1));
      else add(1n, x.args);
    } else add(1n, [x]);
  }
  let result: Expr[] = [];
  for (const [coeff, expr] of coeffMap.values()) {
    if (coeff === 1n) result.push(expr);
    else if (coeff !== 0n) result.push(_polygolfOp("mul", int(coeff), expr));
  }
  if (
    result.length < 1 ||
    constant !== 0n ||
    (result.length === 1 && result[0].kind === "ImplicitConversion")
  )
    result = [int(constant), ...result];
  return result;
}

export const add1 = (expr: Expr) => polygolfOp("add", expr, int(1n));
export const sub1 = (expr: Expr) => polygolfOp("add", expr, int(-1n));

export function functionCall(
  func: string | Expr,
  ...args: readonly (Expr | readonly Expr[])[]
): FunctionCall {
  return {
    kind: "FunctionCall",
    func: typeof func === "string" ? id(func, true) : func,
    args: args.flat(),
  };
}

export function methodCall(
  object: Expr,
  ident: string | Identifier,
  ...args: readonly Expr[]
): MethodCall {
  return {
    kind: "MethodCall",
    ident: typeof ident === "string" ? id(ident, true) : ident,
    object,
    args,
  };
}

export function propertyCall(
  object: Expr | readonly Expr[],
  ident: string | Identifier
): PropertyCall {
  return {
    kind: "PropertyCall",
    ident: typeof ident === "string" ? id(ident, true) : ident,
    object: [object].flat()[0],
  };
}

export function indexCall(
  collection: string | Expr,
  index: Expr,
  oneIndexed: boolean = false
): IndexCall {
  return {
    kind: "IndexCall",
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
  oneIndexed: boolean = false
): RangeIndexCall {
  return {
    kind: "RangeIndexCall",
    collection: typeof collection === "string" ? id(collection) : collection,
    low,
    high,
    step,
    oneIndexed,
  };
}

export function binaryOp(name: string, left: Expr, right: Expr): BinaryOp {
  return {
    kind: "BinaryOp",
    left,
    right,
    name,
  };
}

export function unaryOp(name: string, arg: Expr): UnaryOp {
  return {
    kind: "UnaryOp",
    arg,
    name,
  };
}

export function conditional(
  condition: Expr,
  consequent: Expr,
  alternate: Expr,
  isSafe: boolean = true
): ConditionalOp {
  return {
    kind: "ConditionalOp",
    condition,
    consequent,
    alternate,
    isSafe,
  };
}

export function func(args: (string | Expr)[], expr: Expr): Function {
  return {
    kind: "Function",
    args: args.map((x) => (typeof x === "string" ? id(x) : x)),
    expr,
  };
}

export function namedArg<T extends Expr>(name: string, value: T): NamedArg<T> {
  return {
    kind: "NamedArg",
    name,
    value,
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

export function isTextLiteral<Value extends string>(
  x: Node,
  ...vals: Value[]
): x is TextLiteral<Value> {
  return (
    x.kind === "TextLiteral" &&
    (vals.length === 0 || vals.includes(x.value as any))
  );
}

export function isIntLiteral<Value extends bigint>(
  x: Node,
  ...vals: Value[]
): x is IntegerLiteral<Value> {
  return (
    x.kind === "IntegerLiteral" &&
    (vals.length === 0 || vals.includes(x.value as any))
  );
}

export function isNegativeLiteral(expr: Expr) {
  return isIntLiteral(expr) && expr.value < 0n;
}

/**
 * Checks whether the expression is a negative integer literal or a multiplication with one.
 */
export function isNegative(expr: Expr) {
  return (
    isNegativeLiteral(expr) ||
    (isPolygolfOp(expr, "mul") && isNegativeLiteral(expr.args[0]))
  );
}

export function isPolygolfOp<Op extends OpCode>(
  x: Node,
  ...ops: Op[]
): x is PolygolfOp<
  // Typesafe-wise, this is the same as `x is PolygolfOp<Op>`.
  // However, this allows `Op` to be written using the type aliases.
  // Alias using the first type that is a match (that is a subtype) and union the rest.
  // For some reason, when I alias this type, it no longer works.
  AliasedOpCode<
    Op,
    OpCode,
    AliasedOpCode<
      Op,
      FrontendOpCode,
      AliasedOpCode<
        Op,
        BinaryOpCode,
        AliasedOpCode<
          Op,
          UnaryOpCode,
          AliasedOpCode<
            Op,
            AssociativeOpCode,
            AliasedOpCode<Op, CommutativeOpCode>
          >
        >
      >
    >
  >
> {
  return (
    x.kind === "PolygolfOp" && (ops.length === 0 || ops?.includes(x.op as any))
  );
}
