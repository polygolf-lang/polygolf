import { Plugin, OpTransformOutput } from "../common/Language";
import {
  assignment,
  binaryOp,
  BinaryOpCode,
  Expr,
  IndexCall,
  indexCall,
  int,
  isBinary,
  OpCode,
  polygolfOp,
  unaryOp,
  UnaryOpCode,
} from "../IR";
import { getType } from "../common/getType";

export function mapOps(opMap0: [OpCode, OpTransformOutput][]): Plugin {
  const opMap = new Map<string, OpTransformOutput>(opMap0);
  return {
    name: "mapOps(...)",
    allOrNothing: true,
    visit(node, spine) {
      if (node.kind === "PolygolfOp") {
        const op = node.op;
        const f = opMap.get(op);
        if (f !== undefined) {
          let replacement = f(node.args);
          if ("op" in replacement && replacement.kind !== "PolygolfOp") {
            // "as any" because TS doesn't do well with the "in" keyword
            replacement = { ...(replacement as any), op: node.op };
          }
          return { ...replacement, type: getType(node, spine.root.node) };
        }
      }
    },
  };
}

/**
 * Plugin transforming binary and unary ops to the name and precedence in the target lang.
 * @param opMap0 Each group defines operators of the same precedence, higher precedence ones first.
 * @returns The plugin closure.
 */
export function mapPrecedenceOps(
  ...opMap0: [UnaryOpCode | BinaryOpCode, string, boolean?][][]
): Plugin {
  function opTransform(
    recipe: [UnaryOpCode | BinaryOpCode, string, boolean?],
    precedence: number
  ): [OpCode, OpTransformOutput] {
    const [op, name, rightAssociative] = recipe;
    return [
      op,
      isBinary(op)
        ? (x: readonly Expr[]) =>
            binaryOp(
              op,
              x[0],
              x[1],
              name,
              precedence,
              rightAssociative ?? (op === "pow" || op === "text_concat")
            )
        : (x: readonly Expr[]) => unaryOp(op, x[0], name, precedence),
    ];
  }
  const opMap = opMap0.flatMap((x, i) =>
    x.map((recipe) => opTransform(recipe, opMap0.length - i))
  );
  return {
    ...mapOps(opMap),
    name: `mapPrecedenceOps(${JSON.stringify(opMap0)})`,
  };
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
  ]
): Plugin {
  return {
    name: `useIndexCalls(${JSON.stringify(oneIndexed)}, ${JSON.stringify(
      ops
    )})`,
    allOrNothing: true,
    visit(node) {
      if (
        node.kind === "PolygolfOp" &&
        (ops.length === 0 || ops.includes(node.op)) &&
        (node.args[0].kind === "Identifier" || node.op.endsWith("_get"))
      ) {
        let indexNode: IndexCall;
        if (oneIndexed && !node.op.startsWith("table_")) {
          indexNode = indexCall(
            node.args[0],
            polygolfOp("add", node.args[1], int(1n)),
            node.op,
            true
          );
        } else {
          indexNode = indexCall(node.args[0], node.args[1], node.op);
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

export function plus1(expr: Expr): Expr {
  return polygolfOp("add", expr, int(1n));
}
