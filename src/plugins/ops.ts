import type { Plugin } from "../common/Language";
import {
  add1,
  assignment,
  infix,
  type BinaryOpCode,
  type Node,
  indexCall,
  isCommutative,
  isInt,
  isNegative,
  isOp,
  type OpCode,
  type Op,
  op,
  prefix,
  type UnaryOpCode,
  functionCall,
  propertyCall,
  postfix,
  type VariadicOpCode,
  BinaryOpCodes,
  flippedOpCode,
  list,
  methodCall,
  type TernaryOpCode,
  isVariadic,
  type NullaryOpCode,
  builtin,
} from "../IR";
import { type Spine } from "../common/Spine";
import { stringify } from "../common/stringify";
import { replaceAtIndex } from "../common/arrays";
import { type CompilationContext } from "@/common/compile";

function enhanceOpMap<Op extends OpCode, T>(opMap: Partial<Record<Op, T>>) {
  for (const [a, b] of [
    ["unsafe_and", "and"],
    ["unsafe_or", "or"],
  ] as any) {
    if (!(a in opMap) && b in opMap) {
      (opMap as any)[a] = (opMap as any)[b];
    }
  }
}

export type OpMapper<T> = (
  arg: T,
  opArgs: readonly Node[],
  opCode: OpCode,
  s: Spine,
  c: CompilationContext,
) => Node | undefined;

export const generalOpMapper: OpMapper<
  | Node
  | ((
      opArgs: readonly Node[],
      s: Spine,
      c: CompilationContext,
    ) => Node | undefined)
> = (arg, opArgs, opCode, s, c) =>
  typeof arg === "function" ? arg(opArgs, s, c) : arg;
export const funcOpMapper: OpMapper<string> = (arg, opArgs) =>
  functionCall(arg, ...opArgs);
export const methodOpMapper: OpMapper<string> = (arg, [first, ...rest]) =>
  methodCall(first, arg, ...rest);
export const propertyOpMapper: OpMapper<string> = (arg, [first]) =>
  propertyCall(first, arg);
export const prefixOpMapper: OpMapper<string> = (arg, opArgs) =>
  prefix(arg, opArgs[0]);
export const infixOpMapper: OpMapper<string> = (arg, opArgs) =>
  infix(arg, opArgs[0], opArgs[1]);
export const postfixOpMapper: OpMapper<string> = (arg, opArgs) =>
  postfix(arg, opArgs[0]);
export const flippedInfixMapper: OpMapper<string> = (arg, opArgs) =>
  infix(arg, opArgs[1], opArgs[0]);
export const indexOpMapper: OpMapper<0 | 1> = (arg, opArgs) => {
  const index = indexCall(opArgs[0], arg === 1 ? add1(opArgs[1]) : opArgs[1]);
  return opArgs.length > 2 ? assignment(index, opArgs[2]) : index; // TODO: consider mapping to infix "=" instead
};
export const builtinOpMapper: OpMapper<string> = builtin;

export function mapOpsUsing<
  Targ = string,
  TOpCode extends OpCode | "pred" | "succ" = OpCode,
>(
  mapper: OpMapper<Targ>,
  variadicModeDefault: "variadic" | "leftChain" | "rightChain",
) {
  return function (
    opCodeMap: Partial<Record<TOpCode, Targ>>,
    variadicMode: "variadic" | "leftChain" | "rightChain" = variadicModeDefault,
  ) {
    enhanceOpMap(opCodeMap);
    return {
      name: "mapOpsUsing(...)",
      bakeType: true,
      visit(node: Node, spine: Spine, context: CompilationContext) {
        function map(opCode: OpCode, exprs: readonly Node[]) {
          const arg = opCodeMap[opCode as TOpCode];
          if (arg !== undefined) {
            exprs =
              variadicMode === "variadic" ||
              (!isVariadic(opCode) && opCode !== "sub") ||
              exprs.length < 3
                ? exprs
                : variadicMode === "leftChain"
                ? [map(opCode, exprs.slice(0, -1))!, exprs.at(-1)!]
                : [exprs[0], map(opCode, exprs.slice(1))!];
            return mapper(
              arg as Targ,
              exprs,
              opCode,
              spine as Spine<Op>,
              context,
            );
          }
        }
        if (isOp()(node)) {
          let exprs = node.args;
          if (
            node.op === "add" &&
            exprs.length === 2 &&
            isInt(-1n, 1n)(exprs[0])
          ) {
            if (exprs[0].value === -1n && "pred" in opCodeMap) {
              return map("pred", [exprs[1]]);
            }
            if (exprs[0].value === 1n && "succ" in opCodeMap) {
              return map("succ", [exprs[1]]);
            }
          }
          if (node.op === "mul" && isInt(-1n)(exprs[0]) && "neg" in opCodeMap) {
            const negation = map("neg", [exprs[1]]);
            if (negation !== undefined) {
              if (exprs.length > 2) {
                exprs = [negation, ...exprs.slice(2)];
              } else {
                return negation;
              }
            }
          }
          if (node.op === "add" && "add" in opCodeMap) {
            let positiveArgs = exprs.filter((x) => !isNegative(x));
            let negativeArgs = exprs.filter((x) => isNegative(x));
            if (positiveArgs.length < 1) {
              positiveArgs = [negativeArgs[0]];
              negativeArgs = negativeArgs.slice(1);
            }
            const positive =
              positiveArgs.length > 1
                ? map("add", positiveArgs)!
                : positiveArgs[0];
            if (negativeArgs.length > 0) {
              return map("sub", [
                positive,
                ...negativeArgs.map((x) => ({
                  ...op("neg", x),
                  targetType: x.targetType,
                })),
              ]);
            }
            return positive;
          }
          return map(node.op, exprs);
        }
      },
    };
  };
}

/** Values are op to be applied to the collection and added to the index or 0 if nothing should be added. */
export const mapBackwardsIndexToForwards = mapOpsUsing<
  0 | (UnaryOpCode & `size${string}`),
  OpCode & `${string}at_back${string}`
>((arg, opArgs, opCode) => {
  const newOpCode = opCode.replaceAll("_back", "") as OpCode;
  return op(
    newOpCode,
    ...(arg === 0
      ? opArgs
      : replaceAtIndex(opArgs, 1, op("add", opArgs[1], op(arg, opArgs[0])))),
  );
}, "variadic");

// "a = a + b" --> "a += b"
export function mapMutationUsing<
  Targ = string,
  TOpCode extends OpCode = OpCode,
>(mapper: OpMapper<Targ>) {
  return function mapAsMutation(
    opMap: Partial<Record<TOpCode, Targ>>,
    keepRestAsOp = true,
  ): Plugin {
    return {
      name: `addMutatingInfix(${JSON.stringify(opMap)})`,
      visit(node, spine, context) {
        if (
          node.kind === "Assignment" &&
          isOp()(node.expr) &&
          node.expr.op in opMap &&
          node.expr.args.length > 1 &&
          node.expr.op in opMap
        ) {
          const opCode = node.expr.op;
          const args = node.expr.args;
          const name = opMap[opCode as TOpCode]!;
          const leftValueStringified = stringify(node.variable);
          const index = node.expr.args.findIndex(
            (x) => stringify(x) === leftValueStringified,
          );
          if (index === 0 || (index > 0 && isCommutative(opCode))) {
            if (
              opCode === "add" &&
              args.length === 2 &&
              index === 1 &&
              isInt()(args[0])
            ) {
              if (args[0].value === -1n && "pred" in opMap) {
                return mapper(
                  opMap.pred as Targ,
                  [args[1]],
                  opCode,
                  spine,
                  context,
                );
              }
              if (args[0].value === 1n && "succ" in opMap) {
                return mapper(
                  opMap.succ as Targ,
                  [args[1]],
                  opCode,
                  spine,
                  context,
                );
              }
            }
            const newArgs = args.filter((x, i) => i !== index);
            if (
              opCode === "add" &&
              "sub" in opMap &&
              newArgs.every(isNegative)
            ) {
              return mapper(
                opMap["sub" as TOpCode] as Targ,
                [node.variable, op("neg", op(opCode, ...newArgs))],
                opCode,
                spine,
                context,
              );
            }
            return mapper(
              name,
              [
                node.variable,
                ...(keepRestAsOp && newArgs.length > 1
                  ? [op(opCode, ...newArgs)]
                  : newArgs),
              ],
              opCode,
              spine,
              context,
            );
          }
        }
      },
    };
  };
}

export const mapOps = mapOpsUsing(generalOpMapper, "variadic");
export const mapOpsTo = {
  func: mapOpsUsing(funcOpMapper, "variadic"),
  method: mapOpsUsing(methodOpMapper, "variadic"),
  prop: mapOpsUsing(propertyOpMapper, "variadic"),
  prefix: mapOpsUsing<string, UnaryOpCode>(prefixOpMapper, "variadic"),
  infix: mapOpsUsing<string, BinaryOpCode | VariadicOpCode>(
    infixOpMapper,
    "leftChain",
  ),
  flippedInfix: mapOpsUsing<string, BinaryOpCode | VariadicOpCode>(
    flippedInfixMapper,
    "leftChain",
  ),
  /** Values are what should be added to the key. */
  index: mapOpsUsing<0 | 1, BinaryOpCode>(indexOpMapper, "variadic"),
  builtin: mapOpsUsing<string, NullaryOpCode>(builtinOpMapper, "variadic"),
};

export const mapMutationTo = {
  func: mapMutationUsing(funcOpMapper),
  method: mapMutationUsing(methodOpMapper),
  infix: mapMutationUsing(infixOpMapper),
  prefix: mapMutationUsing<string, UnaryOpCode>(prefixOpMapper),
  /** Values are what should be added to the key. */
  index: mapMutationUsing<0 | 1, TernaryOpCode>(indexOpMapper),
};

// (a > b) --> (b < a)
export function flipBinaryOps(node: Node) {
  if (isOp(...BinaryOpCodes)(node)) {
    if (node.op in flippedOpCode) {
      return op(
        flippedOpCode[node.op as keyof typeof flippedOpCode],
        node.args[1],
        node.args[0],
      );
    }
    if (isCommutative(node.op)) {
      return op(node.op, node.args[1], node.args[0]);
    }
  }
}

export const removeImplicitConversions: Plugin = {
  name: "removeImplicitConversions",
  bakeType: true,
  visit(node) {
    if (node.kind === "ImplicitConversion") {
      let ret: Node = node;
      while (ret.kind === "ImplicitConversion") {
        ret = ret.expr;
      }
      return ret;
    }
  },
};

export const methodsAsFunctions: Plugin = {
  name: "methodsAsFunctions",
  bakeType: true,
  visit(node) {
    if (node.kind === "MethodCall") {
      return functionCall(propertyCall(node.object, node.ident), node.args);
    }
  },
};

export const printIntToPrint: Plugin = mapOps({
  "print[Int]": (x) => op("print[Text]", op("int_to_dec", ...x)),
  "println[Int]": (x) => op("println[Text]", op("int_to_dec", ...x)),
});

export const arraysToLists: Plugin = {
  name: "arraysToLists",
  bakeType: true,
  visit(node) {
    if (node.kind === "Array") {
      return list(node.exprs);
    }
    if (node.kind === "Op") {
      if (node.op === "at[Array]") return op("at[List]", ...node.args);
      if (node.op === "with_at[Array]")
        return op("with_at[List]", ...node.args);
      if (node.op === "contains[Array]")
        return op("contains[List]", ...node.args);
    }
  },
};
