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
  mutatingInfix,
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
  type MutatingInfix,
} from "../IR";
import { type Spine } from "../common/Spine";
import { stringify } from "../common/stringify";
import { mapObjectValues } from "../common/arrays";

export function mapOps(
  opMap: Partial<Record<OpCode, OpTransformOutput>>,
  name = "mapOps(...)",
): Plugin {
  return {
    name,
    bakeType: true,
    visit(node, spine) {
      if (isOp()(node)) {
        const op = node.op;
        const f = opMap[op];
        if (f !== undefined) {
          return typeof f === "function" ? f(node.args, spine as Spine<Op>) : f;
        }
      }
    },
  };
}

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

export function mapTo<T>(
  constructor: (x: T, args: readonly Node[]) => Node,
): (opMap: Partial<Record<OpCode, T>>) => Plugin {
  function result(
    opMap: Partial<Record<OpCode, T>>,
    predicate?: (n: Node, s: Spine) => boolean,
  ) {
    enhanceOpMap(opMap);
    return mapOps(
      mapObjectValues(
        opMap,
        (name) => (n: readonly Node[], s: Spine) =>
          predicate === undefined || predicate(s.node, s)
            ? constructor(name, n)
            : undefined,
      ),
      `mapTo(${constructor.name})(${JSON.stringify(opMap)})`,
    );
  }
  return result;
}

/**
 * Plugin transforming binary and unary ops to the name and precedence in the target lang.
 * @param opMap OpCode - target op name pairs.
 * @param asMutatingInfix - array of target op names that should be mapped to mutating infix or true for to signify all.
 * @returns The plugin closure.
 */
export function mapToPrefixAndInfix<
  TNames extends string,
  TNamesMutating extends TNames,
>(
  opMap: Partial<
    Record<UnaryOpCode, string> & Record<BinaryOpCode | VariadicOpCode, TNames>
  >,
  asMutatingInfix: true | TNamesMutating[] = [],
): Plugin {
  enhanceOpMap(opMap);
  const justPrefixInfix = mapOps(
    mapObjectValues(opMap, (name, op) =>
      isUnary(op)
        ? (x: readonly Node[]) => prefix(name, x[0])
        : (x: readonly Node[]) => asBinaryChain(op, x, opMap),
    ),
    `mapToPrefixAndInfix(${JSON.stringify(opMap)}, ${JSON.stringify(
      asMutatingInfix,
    )})`,
  );
  if (asMutatingInfix !== true && asMutatingInfix.length < 1)
    return justPrefixInfix;
  const mutatingInfix = addMutatingInfix(
    Object.fromEntries(
      Object.entries(opMap).filter(
        ([k, v]) =>
          (isBinary(k as OpCode) || isVariadic(k as OpCode)) &&
          (asMutatingInfix === true || asMutatingInfix.includes(v as any)),
      ),
    ),
  );
  return {
    ...justPrefixInfix,
    visit(node, spine, context) {
      return (
        mutatingInfix.visit(node, spine, context) ??
        justPrefixInfix.visit(node, spine, context)
      );
    },
  };
}

function asBinaryChain(
  opCode: BinaryOpCode | VariadicOpCode,
  exprs: readonly Node[],
  names: Partial<Record<OpCode, string>>,
): Node {
  const negName = names.neg;
  if (opCode === "mul" && isInt(-1n)(exprs[0]) && negName !== undefined) {
    exprs = [prefix(negName, exprs[1]), ...exprs.slice(2)];
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
      result = infix(subName, result, op("neg", expr));
    } else {
      result = infix(names[opCode] ?? "?", result, expr);
    }
  }
  return result;
}

export function useIndexCalls(
  oneIndexed: boolean = false,
  ops: OpCode[] = [
    "at[Array]",
    "at[List]",
    "at[Table]",
    "set_at[Array]",
    "set_at[List]",
    "set_at[Table]",
  ],
): Plugin {
  return {
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
          indexNode = indexCall(node.args[0], add1(node.args[1]), oneIndexed);
        } else {
          indexNode = indexCall(node.args[0], node.args[1], oneIndexed);
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

// "a = a + b" --> "a += b"
export function addMutatingInfix(
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

export function addPostfixIncAndDec(
  transform: (infix: MutatingInfix) => Node = (x) =>
    postfix(x.name.repeat(2), x.variable),
): Plugin {
  return {
    name: `addPostfixIncAndDec(${JSON.stringify(transform)})`,
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

export const printIntToPrint: Plugin = mapOps(
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
      if (node.op === "set_at[Array]") return op("set_at[List]", ...node.args);
      if (node.op === "contains[Array]")
        return op("contains[List]", ...node.args);
    }
  },
};
