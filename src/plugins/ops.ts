import { type Plugin, type OpTransformOutput } from "../common/Language";
import {
  add1,
  assignment,
  infix,
  type BinaryOpCode,
  type Node,
  flipOpCode,
  type IndexCall,
  indexCall,
  isBinary,
  isCommutative,
  isIntLiteral,
  isNegative,
  mutatingInfix,
  isOp,
  type OpCode,
  type Op,
  op,
  prefix,
  type UnaryOpCode,
  BinaryOpCodes,
  functionCall,
  propertyCall,
  isIdent,
  postfix,
} from "../IR";
import { getType } from "../common/getType";
import { type Spine } from "../common/Spine";
import { stringify } from "../common/stringify";
import { mapObjectValues } from "../common/arrays";

export function mapOps(
  opMap: Partial<Record<OpCode, OpTransformOutput>>,
  name = "mapOps(...)",
): Plugin {
  return {
    name,
    visit(node, spine) {
      if (isOp()(node)) {
        const op = node.op;
        const f = opMap[op];
        if (f !== undefined) {
          let replacement =
            typeof f === "function" ? f(node.args, spine as Spine<Op>) : f;
          if (replacement === undefined) return undefined;
          if ("op" in replacement && !isOp()(replacement)) {
            // "as any" because TS doesn't do well with the "in" keyword
            replacement = {
              ...(replacement as any),
              op: node.op,
            };
          }
          return { ...replacement!, type: getType(node, spine) };
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
 * @returns The plugin closure.
 */
export function mapToPrefixAndInfix(
  opMap: Partial<Record<UnaryOpCode | BinaryOpCode, string>>,
): Plugin {
  enhanceOpMap(opMap);
  return mapOps(
    mapObjectValues(opMap, (name, op) =>
      isBinary(op)
        ? (x: readonly Node[]) => asBinaryChain(op, x, opMap)
        : (x: readonly Node[]) => prefix(name, x[0]),
    ),
    `mapToPrefixAndInfix(${JSON.stringify(opMap)})`,
  );
}

function asBinaryChain(
  opCode: BinaryOpCode,
  exprs: readonly Node[],
  names: Partial<Record<OpCode, string>>,
): Node {
  const negName = names.neg;
  if (
    opCode === "mul" &&
    isIntLiteral(-1n)(exprs[0]) &&
    negName !== undefined
  ) {
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
    "array_get",
    "list_get",
    "table_get",
    "array_set",
    "list_set",
    "table_set",
  ],
): Plugin {
  return {
    name: `useIndexCalls(${JSON.stringify(oneIndexed)}, ${JSON.stringify(
      ops,
    )})`,
    visit(node) {
      if (
        isOp(...ops)(node) &&
        (isIdent()(node.args[0]) || node.op.endsWith("_get"))
      ) {
        let indexNode: IndexCall;
        if (oneIndexed && !node.op.startsWith("table_")) {
          indexNode = indexCall(node.args[0], add1(node.args[1]), true);
        } else {
          indexNode = indexCall(node.args[0], node.args[1]);
        }
        if (node.op.endsWith("_get")) {
          return indexNode;
        } else if (node.op.endsWith("_set")) {
          return assignment(indexNode, node.args[2]);
        }
      }
    },
  };
}

// "a = a + b" --> "a += b"
export function addMutatingInfix(
  opMap: Partial<Record<BinaryOpCode, string>>,
): Plugin {
  return {
    name: `addMutatingInfix(${JSON.stringify(opMap)})`,
    visit(node) {
      if (
        node.kind === "Assignment" &&
        isOp(...BinaryOpCodes)(node.expr) &&
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

export const addPostfixIncAndDec: Plugin = {
  name: "addPostfixIncAndDec",
  visit(node) {
    if (
      node.kind === "MutatingInfix" &&
      ["+", "-"].includes(node.name) &&
      isIntLiteral(1n)(node.right)
    ) {
      return postfix(node.name.repeat(2), node.variable);
    }
  },
};

// (a > b) --> (b < a)
export const flipBinaryOps: Plugin = {
  name: "flipBinaryOps",
  visit(node) {
    if (isOp(...BinaryOpCodes)(node)) {
      const flippedOpCode = flipOpCode(node.op);
      if (flippedOpCode !== null) {
        return op(flippedOpCode, node.args[1], node.args[0]);
      }
    }
  },
};

export const removeImplicitConversions: Plugin = {
  name: "removeImplicitConversions",
  visit(node) {
    if (node.kind === "ImplicitConversion") {
      return node.expr;
    }
  },
};

export const methodsAsFunctions: Plugin = {
  name: "methodsAsFunctions",
  visit(node) {
    if (node.kind === "MethodCall") {
      return functionCall(propertyCall(node.object, node.ident), node.args);
    }
  },
};

export const printIntToPrint: Plugin = mapOps(
  {
    print_int: (x) => op("print", op("int_to_text", ...x)),
    println_int: (x) => op("println", op("int_to_text", ...x)),
  },
  "printIntToPrint",
);
