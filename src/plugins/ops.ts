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
} from "../IR";
import { type Spine } from "../common/Spine";
import { stringify } from "../common/stringify";
import { replaceAtIndex } from "../common/arrays";
import type { CompilationContext } from "@/common/compile";

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

export function mapOpsUsing<Targ = string, TOpCode extends string = OpCode>(
  mapper: OpMapper<Targ>,
) {
  return function (
    opCodeMap: Partial<Record<TOpCode, Targ>>,
    variadicMode: "variadic" | "leftChain" | "rightChain" = "leftChain",
  ) {
    enhanceOpMap(opCodeMap);
    return {
      name: "mapOpsUsing(...)",
      bakeType: true,
      visit(node: Node, spine: Spine, context: CompilationContext) {
        if (isOp()(node)) {
          let exprs = node.args;
          if (node.op === "mul" && isInt(-1n)(exprs[0]) && "neg" in opCodeMap) {
            const negation = mapper(
              opCodeMap.neg as Targ,
              [exprs[1]],
              "neg",
              spine,
              context,
            );
            if (negation !== undefined)
              return exprs.length > 2
                ? op("mul", negation, ...exprs.slice(2))
                : negation;
          }
          const arg = opCodeMap[node.op as TOpCode];
          if (arg !== undefined) {
            exprs =
              variadicMode === "variadic" ||
              !isVariadic(node.op) ||
              exprs.length < 2
                ? exprs
                : variadicMode === "leftChain"
                ? [op(node.op, ...exprs.slice(0, -1)), exprs.at(-1)!]
                : [exprs[0], op(node.op, ...exprs.slice(1))];
            return mapper(arg, exprs, node.op, spine as Spine<Op>, context);
          }
        }
      },
    };
  };
}

export function asBinaryChain(
  opCode: BinaryOpCode | VariadicOpCode,
  exprs: readonly Node[],
  names: Partial<Record<OpCode, string>>,
  unaryMapping: (name: string, ...args: Node[]) => Node = prefix,
  binaryMapping: (name: string, ...args: Node[]) => Node = infix,
): Node {
  const negName = names.neg;
  if (opCode === "mul" && isInt(-1n)(exprs[0]) && negName !== undefined) {
    exprs = [unaryMapping(negName, exprs[1]), ...exprs.slice(2)];
  }
  if (opCode === "add") {
    exprs = exprs
      .filter((x) => !isNegative(x))
      .concat(exprs.filter(isNegative));
  }
  let result = exprs[0];
  for (const expr of exprs.slice(1)) {
    const subName = names.sub;
    if (opCode === "add" && isNegative(expr) && subName !== undefined) {
      result = binaryMapping(subName, result, {
        ...op("neg", expr),
        targetType: expr.targetType,
      });
    } else {
      result = binaryMapping(names[opCode] ?? "?", result, expr);
    }
  }
  return result;
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
});

// "a = a + b" --> "a += b"
export function mapMutationUsing<
  Targ = string,
  TOpCode extends string = BinaryOpCode | VariadicOpCode,
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

export const mapOps = mapOpsUsing(generalOpMapper);
export const mapOpsToFunc = mapOpsUsing(funcOpMapper);
export const mapOpsToMethod = mapOpsUsing(methodOpMapper);
export const mapOpsToPrefix = mapOpsUsing<string, UnaryOpCode>(prefixOpMapper);
export const mapOpsToInfix = mapOpsUsing<string, BinaryOpCode | VariadicOpCode>(
  infixOpMapper,
);
export const mapOpsToFlippedInfix = mapOpsUsing<
  string,
  BinaryOpCode | VariadicOpCode
>(flippedInfixMapper);
/** Values are what should be added to the key. */
export const mapOpsToIndex = mapOpsUsing<0 | 1, BinaryOpCode>(indexOpMapper);

export const mapMutationToFunc = mapMutationUsing<
  string,
  BinaryOpCode | TernaryOpCode | VariadicOpCode | "inc" | "dec"
>(funcOpMapper);
export const mapMutationToMethod = mapMutationUsing(methodOpMapper);
export const mapMutationToInfix = mapMutationUsing(infixOpMapper);
export const mapMutationToPrefix = mapMutationUsing<string, "inc" | "dec">(
  prefixOpMapper,
);
/** Values are what should be added to the key. */
export const mapMutationToIndex = mapMutationUsing<0 | 1, TernaryOpCode>(
  indexOpMapper,
);

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
