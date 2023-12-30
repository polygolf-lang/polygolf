import { byteLength, charLength } from "../common/strings";
import { getArithmeticType } from "../common/getType";
import { stringify } from "../common/stringify";
import {
  type Identifier,
  type BaseNode,
  id,
  builtin,
  type UnaryOpCode,
  type BinaryOpCode,
  type OpCode,
  type Node,
  type Integer,
  int,
  isAssociative,
  text,
  integerType,
  isConstantType,
  isBinary,
  booleanNotOpCode,
  type Text,
  type VariadicOpCode,
  isCommutative,
  isOpCode,
  inverseOpCode,
  type OpCodeArgValues,
  isUnary,
  opCodeDefinitions,
  isNullary,
} from "./IR";
import { mapObjectValues } from "../common/arrays";

export interface ImplicitConversion extends BaseNode {
  readonly kind: "ImplicitConversion";
  expr: Node;
  behavesLike: UnaryOpCode & `${string}_to_${string}`;
}

/**
 * All expressions start as a `Op` node.
 * This node is used to represent an abstract operation.
 * Plugins (mainly `mapOps, mapToUnaryAndInfixs` plugins) then transform these to how they are represented in the target lang. (function, binary infix op, etc.)
 * This node should never enter the emit phase.
 
* Polygolf ensures that in the IR, there will never be:

 * - Op(neg), Op(sub)
 * - Op(pred), Op(succ)
 * - Op(is_even), Op(is_odd)
 * - Op as a direct child of a Op with the same associative OpCode
 * - Integer as a nonfirst child of a commutative Op
 * - Boolean negation of a boolean negation
 * - Boolean negation of an op that has a negated counterpart
 * 
 * This is ensured when using the op contructor function and the Spine API so avoid creating such nodes manually.
 */
export interface Op<Op extends OpCode = OpCode> extends BaseNode {
  readonly kind: "Op";
  readonly op: Op;
  readonly args: OpCodeArgValues<Op>;
}

export interface KeyValue extends BaseNode {
  readonly kind: "KeyValue";
  readonly key: Node;
  readonly value: Node;
}

export interface FunctionCall extends BaseNode {
  readonly kind: "FunctionCall";
  readonly func: Node;
  readonly args: readonly Node[];
}

export interface MethodCall extends BaseNode {
  readonly kind: "MethodCall";
  readonly object: Node;
  readonly ident: Identifier;
  readonly args: readonly Node[];
}

export interface PropertyCall extends BaseNode {
  readonly kind: "PropertyCall";
  readonly object: Node;
  readonly ident: Identifier;
}

export interface IndexCall extends BaseNode {
  readonly kind: "IndexCall";
  readonly collection: Node;
  readonly index: Node;
}

export interface RangeIndexCall extends BaseNode {
  readonly kind: "RangeIndexCall";
  readonly collection: Node;
  readonly low: Node;
  readonly high: Node;
  readonly step: Node;
}

export interface Infix extends BaseNode {
  readonly kind: "Infix";
  readonly name: string;
  readonly left: Node;
  readonly right: Node;
}

export interface Prefix extends BaseNode {
  readonly kind: "Prefix";
  readonly name: string;
  readonly arg: Node;
}

export interface Postfix extends BaseNode {
  readonly kind: "Postfix";
  readonly name: string;
  readonly arg: Node;
}

/**
 * Conditional ternary operator.
 *
 * Python: [alternate,consequent][condition] or consequent if condition else alternate
 * C: condition?consequent:alternate.
 */
export interface ConditionalOp extends BaseNode {
  readonly kind: "ConditionalOp";
  readonly condition: Node;
  readonly consequent: Node;
  readonly alternate: Node;
  readonly isSafe: boolean; // whether both branches can be safely evaluated (without creating side effects or errors - allows for more golfing)
}

export interface Function extends BaseNode {
  readonly kind: "Function";
  readonly args: readonly Node[];
  readonly expr: Node;
}

export interface NamedArg<T extends Node = Node> extends BaseNode {
  readonly kind: "NamedArg";
  readonly name: string;
  readonly value: T;
}

export function implicitConversion(
  behavesLike: UnaryOpCode & `${string}_to_${string}`,
  expr: Node,
): ImplicitConversion {
  return {
    kind: "ImplicitConversion",
    expr,
    behavesLike,
  };
}

export function keyValue(key: Node, value: Node): KeyValue {
  return {
    kind: "KeyValue",
    key,
    value,
  };
}

/**
 * This object contains contructors for each opcode, with signatures
 * validating the arities.
 */
export const op = {
  ...(mapObjectValues(
    opCodeDefinitions,
    (v, k) =>
      isNullary(k)
        ? opUnsafe(k)
        : (...x: Node[]) =>
            opUnsafe(
              k,
              ...x.filter((x) => typeof x === "object" && "kind" in x),
            ), // allow unary opcodes to be used in map
  ) as {
    [O in OpCode]: OpCodeArgValues<O> extends readonly []
      ? Op<O>
      : (...args: OpCodeArgValues<O>) => Op<O>;
  }),
  unsafe: opUnsafe,
} as const;

/**
 * This assumes that the construction will not break the invariants described
 * on `Op` interface and hence is made private.
 */
function _op(op: OpCode, ...args: Node[]): Op {
  return {
    kind: "Op",
    op,
    args: args as any,
  };
}

/**
 * This is the implementation respecting the invariants described on the `Op`
 * interface, but it doesn't validate arity.
 */
function opUnsafe(opCode: OpCode, ...args: Node[]): Node {
  if (!isOpCode(opCode)) return _op(opCode, ...args);
  if (opCode === "pred") return op.add(args[0], int(-1n));
  if (opCode === "succ") return op.add(args[0], int(1n));
  if (opCode === "is_even")
    return op["eq[Int]"](int(0), op.mod(args[0], int(2)));
  if (opCode === "is_odd")
    return op["eq[Int]"](int(1), op.mod(args[0], int(2)));
  if (isUnary(opCode)) {
    const value = evalUnary(opCode, args[0]);
    if (value !== null) return value;
  }
  if (opCode === "not" || opCode === "bit_not") {
    const arg = args[0];
    if (isOp()(arg)) {
      if (arg.op === opCode && arg.args[0]?.kind !== "ImplicitConversion")
        return arg.args[0]!;
      if (opCode === "not") {
        if (arg.op in booleanNotOpCode) {
          return op.unsafe(
            booleanNotOpCode[arg.op as keyof typeof booleanNotOpCode],
            arg.args[0]!,
            arg.args[1]!,
          );
        }
      }
    }
  }
  if (
    opCode in inverseOpCode &&
    isOp(inverseOpCode[opCode as keyof typeof inverseOpCode])(args[0]) &&
    args[0].args[0].kind !== "ImplicitConversion"
  ) {
    return args[0].args[0];
  }
  if (opCode === "neg") {
    if (isInt()(args[0])) {
      return int(-args[0].value);
    }
    return op.mul(int(-1), args[0]);
  }
  if (opCode === "sub") {
    return op.add(args[0], op.neg(args[1]));
  }
  if (isAssociative(opCode)) {
    args = args.flatMap((x) => (isOp(opCode)(x) ? x.args : [x]));
    if (args.length === 1) return args[0];
    if (opCode === "add") args = simplifyPolynomial(args);
    else {
      if (isCommutative(opCode)) {
        args = args
          .filter((x) => isInt()(x))
          .concat(args.filter((x) => !isInt()(x)));
      } else {
        if (opCode === "concat[Text]")
          args = args.filter((x) => !isText("")(x));
        if (
          args.length === 0 ||
          (args.length === 1 && args[0].kind === "ImplicitConversion")
        ) {
          args = [text(""), args[0]];
        }
      }
      const newArgs: Node[] = [];
      for (const arg of args) {
        if (newArgs.length > 0) {
          const combined = evalBinary(opCode, newArgs[newArgs.length - 1], arg);
          if (combined !== null) {
            newArgs[newArgs.length - 1] = combined;
          } else {
            newArgs.push(arg);
          }
        } else newArgs.push(arg);
      }
      args = newArgs;
      if (opCode === "mul" && args.length > 1 && isNegativeLiteral(args[0])) {
        const toNegate = args.find(
          (x) => isOp("add")(x) && x.args.some(isNegative),
        );
        if (toNegate !== undefined) {
          args = args.map((x) =>
            isInt()(x)
              ? int(-x.value)
              : x === toNegate
              ? op.unsafe("add", ...(x as Op).args.map(op.neg))
              : x,
          );
        }
      }
    }
    if (
      opCode === "mul" &&
      args.length > 1 &&
      isInt(1n)(args[0]) &&
      args[1].kind !== "ImplicitConversion"
    ) {
      args = args.slice(1);
    }

    if (args.length === 1) return args[0];
  }
  if (isBinary(opCode) && args.length === 2) {
    const combined = evalBinary(opCode, args[0], args[1]);
    if (
      combined !== null &&
      (!isInt()(combined) ||
        opCode !== "pow" || // only eval pow if it is a low number
        (combined.value < 1000 && combined.value > -1000))
    ) {
      return combined;
    }
  }
  return _op(opCode, ...args);
}

function evalBinary(
  op: BinaryOpCode | VariadicOpCode,
  left: Node,
  right: Node,
): Integer | Text | null {
  if (op === "concat[Text]" && isText()(left) && isText()(right)) {
    return text(left.value + right.value);
  }
  if (isInt()(left) && isInt()(right)) {
    try {
      const type = getArithmeticType(
        op,
        integerType(left.value, left.value),
        integerType(right.value, right.value),
      );
      if (isConstantType(type)) return int(type.low);
    } catch {
      // The output type is not an integer.
    }
  }
  return null;
}

function evalUnary(op: UnaryOpCode, arg: Node): Integer | Text | null {
  if (isText()(arg)) {
    const value = arg.value;
    switch (op) {
      case "size[byte]":
      case "size[Ascii]":
        return int(byteLength(value));
      case "size[codepoint]":
        return int(charLength(value));
    }
  }
  return null;
}

/** Simplifies a polynomial represented as an array of terms. */
function simplifyPolynomial(terms: Node[]): Node[] {
  const coeffMap = new Map<string, [bigint, Node]>();
  let constant = 0n;
  function add(coeff: bigint, rest: readonly Node[]) {
    const stringified = rest.map((x) => stringify(x)).join("");
    if (coeffMap.has(stringified)) {
      const [oldCoeff, expr] = coeffMap.get(stringified)!;
      coeffMap.set(stringified, [oldCoeff + coeff, expr]);
    } else {
      if (rest.length === 1) coeffMap.set(stringified, [coeff, rest[0]]);
      else coeffMap.set(stringified, [coeff, _op("mul", ...rest)]);
    }
  }
  for (const x of terms) {
    if (isInt()(x)) constant += x.value;
    else if (isOp("mul")(x)) {
      if (isInt()(x.args[0])) add(x.args[0].value, x.args.slice(1));
      else add(1n, x.args);
    } else add(1n, [x]);
  }
  let result: Node[] = [];
  for (const [coeff, expr] of coeffMap.values()) {
    if (coeff === 1n) result.push(expr);
    else if (coeff !== 0n) result.push(_op("mul", int(coeff), expr));
  }
  if (
    result.length < 1 ||
    constant !== 0n ||
    (result.length === 1 && result[0].kind === "ImplicitConversion")
  )
    result = [int(constant), ...result];
  if (
    terms.length === result.length &&
    result.every((x, i) => stringify(x, true) === stringify(terms[i], true))
  )
    return terms;
  return result;
}

export function intToDecOpOrText(x: Node) {
  return isInt()(x) ? text(x.value.toString()) : op.int_to_dec(x);
}

export const succ = op.succ;
export const pred = op.pred;

export function functionCall(
  func: string | Node,
  ...args: readonly (Node | readonly Node[])[]
): FunctionCall {
  return {
    kind: "FunctionCall",
    func: typeof func === "string" ? builtin(func) : func,
    args: args.flat(),
  };
}

export function methodCall(
  object: Node,
  ident: string | Identifier,
  ...args: readonly Node[]
): MethodCall {
  return {
    kind: "MethodCall",
    ident: typeof ident === "string" ? builtin(ident) : ident,
    object,
    args,
  };
}

export function propertyCall(
  object: Node | readonly Node[],
  ident: string | Identifier,
): PropertyCall {
  return {
    kind: "PropertyCall",
    ident: typeof ident === "string" ? id(ident, true) : ident,
    object: [object].flat()[0],
  };
}

export function indexCall(collection: string | Node, index: Node): IndexCall {
  return {
    kind: "IndexCall",
    collection: typeof collection === "string" ? id(collection) : collection,
    index,
  };
}

export function rangeIndexCall(
  collection: string | Node,
  low: Node,
  high: Node,
  step: Node,
): RangeIndexCall {
  return {
    kind: "RangeIndexCall",
    collection: typeof collection === "string" ? id(collection) : collection,
    low,
    high,
    step,
  };
}

export function infix(name: string, left: Node, right: Node): Infix {
  return {
    kind: "Infix",
    left,
    right,
    name,
  };
}

export function prefix(name: string, arg: Node): Prefix {
  return {
    kind: "Prefix",
    arg,
    name,
  };
}

export function postfix(name: string, arg: Node): Postfix {
  return {
    kind: "Postfix",
    arg,
    name,
  };
}

export function conditional(
  condition: Node,
  consequent: Node,
  alternate: Node,
  isSafe: boolean = true,
): ConditionalOp {
  return {
    kind: "ConditionalOp",
    condition,
    consequent,
    alternate,
    isSafe,
  };
}

export function func(args: (string | Node)[], expr: Node): Function {
  return {
    kind: "Function",
    args: args.map((x) => (typeof x === "string" ? id(x) : x)),
    expr,
  };
}

export function namedArg<T extends Node>(name: string, value: T): NamedArg<T> {
  return {
    kind: "NamedArg",
    name,
    value,
  };
}

export function print(value: Node, newline: boolean = true): Node {
  return op[newline ? "println[Text]" : "print[Text]"](value);
}

export function getArgs(
  node:
    | Op
    | Infix
    | Prefix
    | FunctionCall
    | MethodCall
    | IndexCall
    | RangeIndexCall,
): readonly Node[] {
  switch (node.kind) {
    case "Infix":
      return [node.left, node.right];
    case "Prefix":
      return [node.arg];
    case "FunctionCall":
      return node.args;
    case "MethodCall":
      return [node.object, ...node.args];
    case "Op":
      return node.args;
    case "IndexCall":
      return [node.collection, node.index];
    case "RangeIndexCall":
      return [node.collection, node.low, node.high, node.step];
  }
}

export function isOfKind<Kind extends Node["kind"]>(
  ...kinds: Kind[]
): (x: Node) => x is Node & { kind: Kind } {
  return ((x: Node) => kinds.includes(x.kind as any)) as any;
}

export function isText<Value extends string>(
  ...vals: Value[]
): (x: Node) => x is Text<Value> {
  return ((x: Node) =>
    x.kind === "Text" &&
    (vals.length === 0 || vals.includes(x.value as any))) as any;
}

export function isIdent<Name extends string>(
  ...names: (Name | Identifier<boolean, Name>)[]
): (x: Node) => x is Identifier<boolean, Name> {
  return ((x: Node) =>
    x.kind === "Identifier" &&
    (names.length === 0 ||
      names.some(
        (n) => (typeof n === "string" ? n : n.name) === x.name,
      ))) as any;
}

export function isBuiltinIdent<Name extends string>(
  ...names: (Name | Identifier<boolean, Name>)[]
): (x: Node) => x is Identifier<true, Name> {
  return ((x: Node) =>
    x.kind === "Identifier" &&
    x.builtin &&
    (names.length === 0 ||
      names.some(
        (n) => (typeof n === "string" ? n : n.name) === x.name,
      ))) as any;
}

export function isUserIdent<Name extends string>(
  ...names: (Name | Identifier<boolean, Name>)[]
): (x: Node) => x is Identifier<false, Name> {
  return ((x: Node) =>
    x.kind === "Identifier" &&
    !x.builtin &&
    (names.length === 0 ||
      names.some(
        (n) => (typeof n === "string" ? n : n.name) === x.name,
      ))) as any;
}

export function isInt<Value extends bigint>(
  ...vals: Value[]
): (x: Node) => x is Integer<Value> {
  return ((x: Node) =>
    x.kind === "Integer" &&
    (vals.length === 0 || vals.includes(x.value as any))) as any;
}

export function isNegativeLiteral(expr: Node) {
  return isInt()(expr) && expr.value < 0n;
}

/**
 * Checks whether the expression is a negative integer literal or a multiplication with one.
 */
export function isNegative(expr: Node) {
  return (
    isNegativeLiteral(expr) ||
    (isOp("mul")(expr) && isNegativeLiteral(expr.args[0]))
  );
}

export function isOp<O extends OpCode>(...ops: O[]): (x: Node) => x is Op<O> {
  return ((x: Node) =>
    x.kind === "Op" && (ops.length === 0 || ops?.includes(x.op as any))) as any;
}
