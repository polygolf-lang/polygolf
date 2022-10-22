import { getType } from "../common/getType";
import { Path } from "../common/traverse";
import {
  forRange,
  int,
  varDeclaration,
  assignment,
  whileLoop,
  forCLike,
  block,
  forEachPair,
  forEach,
  id,
  IR,
  integerType,
  polygolfOp,
} from "../IR";

export const forRangeToForRangeInclusive = {
  enter(path: Path) {
    const node = path.node;
    if (node.type === "ForRange" && !node.inclusive) {
      path.replaceWith(
        forRange(
          node.variable,
          node.low,
          polygolfOp("sub", node.high, int(1n)),
          node.increment,
          node.body,
          true
        )
      );
    }
  },
};

/**
 * Only switch if it is shorter
 */
export const useInclusiveForRange = {
  enter(path: Path) {
    const node = path.node;
    if (node.type === "ForRange" && !node.inclusive) {
      if (node.high.type === "IntegerLiteral") {
        node.inclusive = true;
        node.high.value = node.high.value - 1n;
      } else if (node.high.type === "BinaryOp" && node.high.op === "add") {
        if (
          node.high.right.type === "IntegerLiteral" &&
          node.high.right.value === 1n
        ) {
          node.inclusive = true;
          node.high = node.high.left;
        } else if (
          node.high.left.type === "IntegerLiteral" &&
          node.high.left.value === 1n
        ) {
          node.inclusive = true;
          node.high = node.high.right;
        }
      }
    }
  },
};

export const forRangeToWhile = {
  enter(path: Path) {
    const node = path.node;
    if (node.type === "ForRange") {
      const low = getType(node.low, path.root.node);
      const high = getType(node.high, path.root.node);
      if (low.type !== "integer" || high.type !== "integer") {
        throw new Error(`Unexpected type (${low.type},${high.type})`);
      }
      node.body.children.push(
        assignment(
          node.variable,
          polygolfOp("add", node.variable, node.increment)
        )
      );
      path.replaceWithMultiple([
        varDeclaration(
          node.variable,
          integerType(
            low.low,
            high.high === undefined
              ? undefined
              : high.high - (node.inclusive ? 0n : -1n)
          )
        ),
        assignment(node.variable, node.low),
        whileLoop(
          polygolfOp(node.inclusive ? "leq" : "lt", node.variable, node.high),
          node.body
        ),
      ]);
    }
  },
};

export const forRangeToForCLike = {
  enter(path: Path) {
    const node = path.node;
    if (node.type === "ForRange") {
      const low = getType(node.low, path.root.node);
      const high = getType(node.high, path.root.node);
      if (low.type !== "integer" || high.type !== "integer") {
        throw new Error(`Unexpected type (${low.type},${high.type})`);
      }
      path.replaceWith(
        forCLike(
          block([
            varDeclaration(
              node.variable,
              integerType(
                low.low,
                high.high === undefined
                  ? undefined
                  : high.high - (node.inclusive ? 0n : -1n)
              )
            ),
            assignment(node.variable, node.low),
          ]),
          block([polygolfOp("add", node.variable, node.increment ?? int(1n))]),
          polygolfOp(node.inclusive ? "leq" : "lt", node.variable, node.high),
          node.body
        )
      );
    }
  },
};

/**
 * Python:
 * for i in range(len(collection)):
 *     commands(i, collection[i])
 *           |
 *           V
 * for i,x in enumerate(collection):
 *     commands(i, x)
 */
// TODO: Handle inclusive like Lua's `for i=1,#L do commands(i, L[i]) end
export const forRangeToForEachPair = {
  enter(path: Path) {
    const node = path.node;
    if (
      node.type === "ForRange" &&
      !node.inclusive &&
      node.low.type === "IntegerLiteral" &&
      node.low.value === 0n &&
      node.high.type === "PolygolfOp" &&
      node.high.op === "cardinality" &&
      node.high.args[0].type === "Identifier"
    ) {
      const collection = node.high.args[0];
      const elementIdentifier = id(path.getNewIdentifier());
      const bodyPath = new Path(node.body, path, "body");
      bodyPath.visit({
        // inside the body, replace each `collection`[`node.variable`] with `elementIdentifier`
        enter(path2: Path) {
          const node2 = path2.node;
          if (isArrayOrListGet(node2, collection.name, node.variable.name)) {
            path2.replaceWith(elementIdentifier);
          }
        },
      });
      path.replaceWith(
        forEachPair(node.variable, elementIdentifier, collection, node.body)
      );
    }
  },
};

/**
 * Python:
 * for i in range(len(collection)):
 *     commands(collection[i])
 *           |
 *           V
 * for x in collection:
 *     commands(x)
 */
export const forRangeToForEach = {
  enter(path: Path) {
    const node = path.node;
    if (
      node.type === "ForRange" &&
      !node.inclusive &&
      node.low.type === "IntegerLiteral" &&
      node.low.value === 0n &&
      node.high.type === "PolygolfOp" &&
      node.high.op === "cardinality" &&
      node.high.args[0].type === "Identifier"
    ) {
      const collection = node.high.args[0];
      const elementIdentifier = id(path.getNewIdentifier());
      const bodyPath = new Path(node.body, path, "body");
      if (!isVariableUsedAlone(bodyPath, collection.name, node.variable.name)) {
        // if the loop variable is only used to index the collection
        bodyPath.visit({
          // inside the body, replace each `collection`[`node.variable`] with `elementIdentifier`
          enter(path2: Path) {
            const node2 = path2.node;
            if (isArrayOrListGet(node2, collection.name, node.variable.name)) {
              path2.replaceWith(elementIdentifier);
            }
          },
        });
        path.replaceWith(forEach(elementIdentifier, collection, node.body));
      }
    }
  },
};

function isArrayOrListGet(node: IR.Node, collection: string, index: string) {
  if (
    node.type !== "PolygolfOp" ||
    (node.op !== "list_get" && node.op !== "array_get")
  )
    return false;
  const args = node.args;
  return (
    args[0].type === "Identifier" &&
    args[0].name === collection &&
    args[1].type === "Identifier" &&
    args[1].name === index
  );
}

function isVariableUsedAlone(path: Path, collection: string, index: string) {
  return path.anyNode(
    (x) =>
      x.node.type === "Identifier" &&
      x.node.name === index &&
      !isArrayOrListGet(x.parent!.node, collection, index)
  );
}
