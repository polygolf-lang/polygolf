import { type Plugin, type OpTransformOutput } from "../common/Language";
import {
  add1,
  assignment,
  infix,
  type BinaryOpCode,
  type Node,
  type IndexCall,
  indexCall,
  isBinary,
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
  isIdent,
  postfix,
  type VariadicOpCode,
  BinaryOpCodes,
  VariadicOpCodes,
  isUnary,
  flippedOpCode,
  isVariadic,
  list,
  func,
  methodCall,
} from "../IR";
import { type Spine } from "../common/Spine";
import { stringify } from "../common/stringify";
import { mapObjectValues } from "../common/arrays";
import { CompilationContext } from "@/common/compile";

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
  s: Spine<Op>,
  c: CompilationContext,
) => Node | undefined;

export const generalOpMapper: OpMapper<
  | Node
  | ((
      opArgs: readonly Node[],
      s: Spine<Op>,
      c: CompilationContext,
    ) => Node | undefined)
> = (arg, opArgs, opCode, s, c) =>
  typeof arg === "function" ? arg(opArgs, s, c) : arg;
export const funcOpMapper: OpMapper<string> = (arg, opArgs) =>
  functionCall(arg, ...opArgs);
export const methodOpMapper: OpMapper<string> = (arg, opArgs) =>
  methodCall(opArgs[0], arg, ...opArgs.slice(1));
export const prefixOpMapper: OpMapper<string> = (arg, opArgs) =>
  prefix(arg, opArgs[0]);
export const infixOpMapper: OpMapper<string> = (arg, opArgs) =>
  infix(arg, ...opArgs);
export const postfixOpMapper: OpMapper<string> = (arg, opArgs) =>
  postfix(arg, opArgs[0]);
export const prefixOrInfixOpMapper: OpMapper<string> = (arg, opArgs, opCode) =>
  isUnary(opCode) ? prefix(arg, opArgs[0]) : infix(arg, ...opArgs);
export const flippedInfixMapper: OpMapper<string> = (arg, opArgs) =>
  infix(arg, ...opArgs.toReversed());

export function mapOpsUsing<Targ = string, TOpCode extends OpCode = OpCode>(
  mapper: OpMapper<Targ>,
) {
  return function (
    opCodeMap: Partial<Record<TOpCode, Targ>>,
    name = "mapOpsUsing(...)",
  ) {
    enhanceOpMap(opCodeMap);
    return {
      name,
      bakeType: true,
      visit(node: Node, spine: Spine, context: CompilationContext) {
        if (isOp()(node)) {
          const arg = opCodeMap[node.op as TOpCode];
          if (arg !== undefined) {
            return mapper(arg, node.args, node.op, spine as Spine<Op>, context);
          }
        }
      },
    };
  };
}

export const mapOps = mapOpsUsing(generalOpMapper);
export const mapOpsToFunc = mapOpsUsing(funcOpMapper);
export const mapOpsToMethod = mapOpsUsing(methodOpMapper);
export const mapOpsToPrefixOrInfix = mapOpsUsing(prefixOrInfixOpMapper);
export const mapOpsToPrefix = mapOpsUsing<string, UnaryOpCode>(prefixOpMapper);
export const mapOpsToInfix = mapOpsUsing<string, BinaryOpCode | VariadicOpCode>(
  infixOpMapper,
);
export const mapOpsToFlippedInfix = mapOpsUsing<
  string,
  BinaryOpCode | VariadicOpCode
>(flippedInfixMapper);

function asBinaryChain(
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

export function useIndexCalls(
  oneIndexed: boolean = false,
  ops = [
    "at[Array]" as const,
    "at[List]" as const,
    "at_back[List]" as const,
    "at[Table]" as const,
  ],
): Plugin {
  return {
    bakeType: true,
    name: `useIndexCalls(${JSON.stringify(oneIndexed)}, ${JSON.stringify(
      ops,
    )})`,
    visit(node) {
      if (
        isOp(...ops)(node) &&
        (isIdent()(node.args[0]) || !node.op.startsWith("set_"))
      ) {
        let indexNode: IndexCall;
        if (oneIndexed && !node.op.endsWith("[Table]")) {
          indexNode = indexCall(node.args[0], add1(node.args[1]));
        } else {
          indexNode = indexCall(node.args[0], node.args[1]);
        }
        if (!node.op.startsWith("set_")) {
          return indexNode;
        } else {
          return assignment(indexNode, node.args[2]);
        }
      }
    },
  };
}

export function backwardsIndexToForwards(
  addLength = true,
  ops: OpCode[] = [
    "at_back[Ascii]" as const,
    "at_back[byte]" as const,
    "at_back[codepoint]" as const,
    "at_back[List]" as const,
    "with_at_back[List]" as const,
  ],
): Plugin {
  return {
    name: "backwardsIndexToForwards",
    visit(node, spine, context) {
      if (isOp(...ops)(node)) {
        const [collection, index, value] = node.args;
        return mapOpsUsing({
          "at_back[Ascii]": op(
            "at[Ascii]",
            collection,
            addLength ? op("add", index, op("size[Ascii]", collection)) : index,
          ),
          "at_back[byte]": op(
            "at[byte]",
            collection,
            addLength ? op("add", index, op("size[byte]", collection)) : index,
          ),
          "at_back[codepoint]": op(
            "at[codepoint]",
            collection,
            addLength
              ? op("add", index, op("size[codepoint]", collection))
              : index,
          ),
          "at_back[List]": op(
            "at[List]",
            collection,
            addLength ? op("add", index, op("size[List]", collection)) : index,
          ),
          "with_at_back[List]": op(
            "with_at_back[List]",
            collection,
            addLength ? op("add", index, op("size[List]", collection)) : index,
            value,
          ),
        }).visit(node, spine, context);
      }
    },
  };
}

// "a = a + b" --> "a += b"
export function mapAsMutation(
  opMap: Partial<Record<BinaryOpCode | VariadicOpCode, string>>,
): Plugin {
  return {
    name: `addMutatingInfix(${JSON.stringify(opMap)})`,
    visit(node) {
      if (
        node.kind === "Assignment" &&
        isOp(...BinaryOpCodes, ...VariadicOpCodes)(node.expr) &&
        node.expr.args.length > 1 &&
        node.expr.op in opMap
      ) {
        const opCode = node.expr.op;
        const args = node.expr.args;
        const name = opMap[opCode]!;
        const leftValueStringified = stringify(node.variable);
        const index = node.expr.args.findIndex(
          (x) => stringify(x) === leftValueStringified,
        );
        if (index === 0 || (index > 0 && isCommutative(opCode))) {
          const newArgs = args.filter((x, i) => i !== index);
          if (opCode === "add" && "sub" in opMap && newArgs.every(isNegative)) {
            return mutatingInfix(
              opMap.sub!,
              node.variable,
              op("neg", op(opCode, ...newArgs)),
            );
          }
          return mutatingInfix(
            name,
            node.variable,
            newArgs.length > 1 ? op(opCode, ...newArgs) : newArgs[0],
          );
        }
      }
    },
  };
}

export function addIncAndDec(
  transform: (infix: MutatingInfix) => Node = (x) =>
    postfix(x.name.repeat(2), x.variable),
): Plugin {
  return {
    name: `addIncAndDec(${JSON.stringify(transform)})`,
    visit(node) {
      if (
        node.kind === "MutatingInfix" &&
        ["+", "-"].includes(node.name) &&
        isInt(1n)(node.right)
      ) {
        return transform(node);
      }
    },
  };
}

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

export const printIntToPrint: Plugin = mapOpsUsing(
  {
    "print[Int]": (x) => op("print[Text]", op("int_to_dec", ...x)),
    "println[Int]": (x) => op("println[Text]", op("int_to_dec", ...x)),
  },
  "printIntToPrint",
);

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
