import type { Plugin } from "../common/Language";
import {
  succ,
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
  type OpCodeArgValues,
  defaults,
  isEqualToLiteral,
  type PhysicalOpCode,
  isVirtualOpCode,
  argsOf,
} from "../IR";
import { type Spine } from "../common/Spine";
import { stringify } from "../common/stringify";
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

interface WithPreprocess<T> {
  value: T;
  preprocess: (x: readonly Node[], opCode: OpCode) => readonly Node[];
}

function isWithPreprocess<T>(x: T | WithPreprocess<T>): x is WithPreprocess<T> {
  return (
    typeof x === "object" && x !== null && "preprocess" in x && "value" in x
  );
}

export function flipped<T>(
  value: T,
): WithPreprocess<T extends TemplateStringsArray ? string : T> {
  return {
    value: Array.isArray(value) && "raw" in value ? value[0] : value,
    preprocess: (x) => [...x].reverse(),
  };
}

export function withDefaults<T>(
  value: T,
): WithPreprocess<T extends TemplateStringsArray ? string : T> {
  return {
    value: Array.isArray(value) && "raw" in value ? value[0] : value,
    preprocess: (x, opCode) => {
      const res = [...x];
      for (let i = x.length - 1; i >= 0; i--) {
        const def = (defaults[opCode] ?? [])[i];
        if (def !== undefined && isEqualToLiteral(res[i], def)) {
          res.splice(i, 1);
        }
      }
      return res;
    },
  };
}

export type OpMapper<T> = (
  arg: T,
  opArgs: readonly Node[],
  opCode: OpCode,
  s: Spine,
  c: CompilationContext,
) => Node | undefined;

export const generalOpMapper: OpMapper<
  (...opArgs: readonly Node[]) => Node | undefined
> = (arg, opArgs) => arg(...opArgs);
export const funcOpMapper: OpMapper<string> = (arg, opArgs) =>
  functionCall(arg, ...opArgs);
export const methodOpMapper: OpMapper<string> = (arg, [first, ...rest]) =>
  methodCall(first, arg, ...rest);
export const propertyOpMapper: OpMapper<string> = (arg, [first]) =>
  propertyCall(first, arg);
export const prefixOpMapper: OpMapper<string> = (arg, opArgs) =>
  prefix(arg, opArgs[0]);
export const infixOpMapper: OpMapper<string> = (arg, opArgs) =>
  infix(arg, ...(opArgs as [Node, Node, ...Node[]]));
export const postfixOpMapper: OpMapper<string> = (arg, opArgs) =>
  postfix(arg, opArgs[0]);
export const indexOpMapper: OpMapper<0 | 1> = (arg, opArgs) => {
  const index = indexCall(opArgs[0], arg === 1 ? succ(opArgs[1]) : opArgs[1]);
  return opArgs.length > 2 ? assignment(index, opArgs[2]) : index; // TODO: consider mapping to infix "=" instead
};
export const builtinOpMapper: OpMapper<string> = builtin;

export function mapOpsUsing<Targ = string, TOpCode extends OpCode = OpCode>(
  mapper: OpMapper<Targ>,
  variadicModeDefault: "variadic" | "leftChain" | "rightChain",
) {
  return function (
    opCodeMap: Partial<Record<TOpCode, Targ | WithPreprocess<Targ>>>,
    variadicMode: "variadic" | "leftChain" | "rightChain" = variadicModeDefault,
  ) {
    enhanceOpMap(opCodeMap);
    const relevantVirtualOpCodes =
      Object.keys(opCodeMap).filter(isVirtualOpCode);
    return {
      name: "mapOpsUsing(...)",
      bakeType: true,
      visit(node: Node, spine: Spine, context: CompilationContext) {
        function map(opCode: OpCode, exprs: readonly Node[]) {
          let arg = opCodeMap[opCode as TOpCode];
          if (arg !== undefined) {
            if (isWithPreprocess(arg)) {
              exprs = arg.preprocess(exprs, opCode);
              arg = arg.value;
            }
            exprs =
              variadicMode === "variadic" ||
              !isVariadic(opCode) ||
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
          for (const virtualOpCode of relevantVirtualOpCodes) {
            const args = argsOf(virtualOpCode)(node);
            if (args !== undefined) {
              return map(virtualOpCode, args);
            }
          }
          return map(node.op, node.args);
        }
      },
    };
  };
}

/** Values are op to be applied to the collection and added to the index or 0 if nothing should be added. */
export const mapBackwardsIndexToForwards = mapOpsUsing<
  0 | (UnaryOpCode & `size${string}`),
  OpCode & `${string}${"at" | "slice"}_back${string}`
>((arg, opArgs, opCode) => {
  const newOpCode = opCode.replaceAll("_back", "") as OpCode;
  return op.unsafe(newOpCode)(
    ...(arg === 0
      ? opArgs
      : opArgs.with(1, op.add(opArgs[1], op[arg](opArgs[0])))),
  );
}, "variadic");

// "a = a + b" --> "a += b"
export function mapMutationUsing<
  Targ = string,
  TOpCode extends OpCode = OpCode,
>(mapper: OpMapper<Targ>, keepRestAsOpDefault: boolean) {
  return function mapAsMutation(
    opMap: Partial<Record<TOpCode, Targ>>,
    keepRestAsOp = keepRestAsOpDefault,
  ): Plugin {
    return {
      name: `addMutatingInfix(${JSON.stringify(opMap)})`,
      visit(node, spine, context) {
        if (
          node.kind === "Assignment" &&
          isOp()(node.expr) &&
          (node.expr.op in opMap ||
            (node.expr.op === "add" &&
              ("succ" in opMap || "pred" in opMap || "sub" in opMap))) &&
          node.expr.args.length > 1
        ) {
          const opCode = node.expr.op;
          const args = node.expr.args;
          const name = opMap[opCode as TOpCode];
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
                [node.variable, op.neg(op.unsafe(opCode)(...newArgs))],
                opCode,
                spine,
                context,
              );
            }
            if (opCode in opMap) {
              return mapper(
                name as any as Targ,
                [
                  node.variable,
                  ...(keepRestAsOp && newArgs.length > 1
                    ? [op.unsafe(opCode)(...newArgs)]
                    : newArgs),
                ],
                opCode,
                spine,
                context,
              );
            }
          }
        }
      },
    };
  };
}

export const mapOps: (
  a: Partial<{
    [O in OpCode]: (...x: OpCodeArgValues<O>) => Node | undefined;
  }>,
) => Plugin = mapOpsUsing(generalOpMapper, "variadic");

export const mapOpsTo = {
  func: mapOpsUsing(funcOpMapper, "variadic"),
  method: mapOpsUsing(methodOpMapper, "variadic"),
  prop: mapOpsUsing(propertyOpMapper, "variadic"),
  prefix: mapOpsUsing<string, UnaryOpCode>(prefixOpMapper, "variadic"),
  infix: mapOpsUsing<string, BinaryOpCode | VariadicOpCode>(
    infixOpMapper,
    "leftChain",
  ),
  /** Values are what should be added to the key. */
  index: mapOpsUsing<0 | 1, BinaryOpCode>(indexOpMapper, "variadic"),
  builtin: mapOpsUsing<string, NullaryOpCode>(builtinOpMapper, "variadic"),
};

export const mapMutationTo = {
  func: mapMutationUsing(funcOpMapper, false),
  method: mapMutationUsing(methodOpMapper, false),
  infix: mapMutationUsing(infixOpMapper, true),
  prefix: mapMutationUsing<string, UnaryOpCode>(prefixOpMapper, true),
  /** Values are what should be added to the key. */
  index: mapMutationUsing<0 | 1, TernaryOpCode>(indexOpMapper, false),
};

// (a > b) --> (b < a)
export function flipBinaryOps(node: Node) {
  if (isOp(...(BinaryOpCodes as (BinaryOpCode & PhysicalOpCode)[]))(node)) {
    if (node.op in flippedOpCode) {
      return op.unsafe(flippedOpCode[node.op as keyof typeof flippedOpCode])(
        node.args[1],
        node.args[0],
      );
    }
    if (isCommutative(node.op)) {
      return op[node.op](node.args[1], node.args[0]);
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

export const arraysToLists: Plugin = {
  name: "arraysToLists",
  bakeType: true,
  visit(node) {
    if (node.kind === "Array") {
      return list(node.value);
    }
    if (node.kind === "Op") {
      if (isOp("at[Array]")(node)) return op["at[List]"](...node.args);
      if (isOp("with_at[Array]")(node))
        return op["with_at[List]"](...node.args);
      if (isOp("contains[Array]")(node))
        return op["contains[List]"](...node.args);
    }
  },
};
