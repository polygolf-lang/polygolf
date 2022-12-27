import { Path, Visitor } from "../common/traverse";
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

export function mapOps(opMap0: [OpCode, (args: Expr[]) => Expr][]): Visitor {
  const opMap = new Map<string, (args: Expr[]) => Expr>(opMap0);
  return {
    name: "mapOps(...)",
    enter(path: Path) {
      const node = path.node;
      if (node.kind === "PolygolfOp") {
        const f = opMap.get(node.op);
        if (f !== undefined) {
          const replacement = f(node.args);
          if ("op" in replacement) replacement.op = node.op;
          replacement.type = getType(node, path.root.node);
          path.replaceWith(replacement);
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
): Visitor {
  function opTransform(
    recipe: [UnaryOpCode | BinaryOpCode, string, boolean?],
    precedence: number
  ): [OpCode, (args: Expr[]) => Expr] {
    const [op, name, rightAssociative] = recipe;
    return [
      op,
      isBinary(op)
        ? (x: Expr[]) =>
            binaryOp(
              op,
              x[0],
              x[1],
              name,
              precedence,
              rightAssociative ?? (op === "pow" || op === "text_concat")
            )
        : (x: Expr[]) => unaryOp(op, x[0], name, precedence),
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
): Visitor {
  return {
    name: `useIndexCalls(${JSON.stringify(oneIndexed)}, ${JSON.stringify(
      ops
    )})`,
    enter(path: Path) {
      const node = path.node;
      if (
        node.kind === "PolygolfOp" &&
        (ops.length === 0 || ops.includes(node.op)) &&
        node.args[0].kind === "Identifier"
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
          path.replaceWith(indexNode);
        } else if (node.op.endsWith("_set")) {
          path.replaceWith(assignment(indexNode, node.args[2]));
        }
      }
    },
  };
}

export function plus1(expr: Expr): Expr {
  return polygolfOp("add", expr, int(1n));
}
