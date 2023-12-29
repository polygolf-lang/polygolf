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

interface WithPreprocess<T> {
  value: T;
  preprocess: (x: readonly Node[]) => readonly Node[];
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
export const indexOpMapper: OpMapper<0 | 1> = (arg, opArgs) => {
  const index = indexCall(opArgs[0], arg === 1 ? succ(opArgs[1]) : opArgs[1]);
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
    opCodeMap: Partial<Record<TOpCode, Targ | WithPreprocess<Targ>>>,
    variadicMode: "variadic" | "leftChain" | "rightChain" = variadicModeDefault,
  ) {
    enhanceOpMap(opCodeMap);
    return {
      name: "mapOpsUsing(...)",
      bakeType: true,
      visit(node: Node, spine: Spine, context: CompilationContext) {
        function map(opCode: OpCode, exprs: readonly Node[]) {
          let arg = opCodeMap[opCode as TOpCode];
          if (arg !== undefined) {
            if (isWithPreprocess(arg)) {
              exprs = arg.preprocess(exprs);
              arg = arg.value;
            }
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
            ("is_even" in opCodeMap || "is_odd" in opCodeMap) &&
            isOp("eq[Int]", "neq[Int]", "leq", "geq", "lt", "gt")(node)
          ) {
            let [a, b] = node.args;
            if (isInt(0n, 1n)(b)) {
              [a, b] = [b, a];
            }
            if (isInt(0n, 1n)(a) && isOp("mod")(b) && isInt(2n)(b.args[1])) {
              let parity: undefined | 0 | 1;
              if (a.value === 0n) {
                if (isOp("neq[Int]", "gt")(node)) parity = 1;
                else if (isOp("eq[Int]", "leq")(node)) parity = 0;
              } else {
                if (isOp("neq[Int]", "lt")(node)) parity = 0;
                else if (isOp("eq[Int]", "geq")(node)) parity = 1;
              }
              if (parity === 0 && "is_even" in opCodeMap) {
                return map("is_even", [b.args[0]]);
              }
              if (parity === 1 && "is_odd" in opCodeMap) {
                return map("is_odd", [b.args[0]]);
              }
            }
          }
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
          if (
            isOp("mul")(node) &&
            isInt(-1n)(node.args[0]) &&
            "neg" in opCodeMap
          ) {
            const negation = map("neg", [node.args[1]]);
            if (negation !== undefined) {
              if (exprs.length > 2) {
                exprs = [negation, ...exprs.slice(2)] as any;
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
                ...negativeArgs.map(
                  (x) =>
                    ({
                      ...op.neg(x),
                      targetType: x.targetType,
                    }) as any,
                ),
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
  OpCode & `${string}${"at" | "slice"}_back${string}`
>((arg, opArgs, opCode) => {
  const newOpCode = opCode.replaceAll("_back", "") as OpCode;
  return op.unsafe(
    newOpCode,
    ...(arg === 0
      ? opArgs
      : replaceAtIndex(opArgs, 1, op.add(opArgs[1], op[arg](opArgs[0])))),
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
                [node.variable, op.neg(op.unsafe(opCode, ...newArgs))],
                opCode,
                spine,
                context,
              );
            }
            if (opCode in opMap) {
              return mapper(
                name,
                [
                  node.variable,
                  ...(keepRestAsOp && newArgs.length > 1
                    ? [op.unsafe(opCode, ...newArgs)]
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
  if (isOp(...BinaryOpCodes)(node)) {
    if (node.op in flippedOpCode) {
      return op.unsafe(
        flippedOpCode[node.op as keyof typeof flippedOpCode],
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

export const printIntToPrint: Plugin = mapOps({
  "print[Int]": (x) => op["print[Text]"](op.int_to_dec(x[0])),
  "println[Int]": (x) => op["println[Text]"](op.int_to_dec(x[0])),
});

export const arraysToLists: Plugin = {
  name: "arraysToLists",
  bakeType: true,
  visit(node) {
    if (node.kind === "Array") {
      return list(node.exprs);
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
