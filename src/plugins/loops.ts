import { getType } from "common/getType";
import { Path } from "../common/traverse";
import {
  forRange,
  binaryOp,
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
} from "../IR";

export const forRangeToForRangeInclusive = {
  enter(path: Path) {
    const node = path.node;
    if (node.type === "ForRange" && !node.inclusive) {
      path.replaceWith(
        forRange(
          node.variable,
          node.low,
          binaryOp("sub", node.high, int(1n)),
          node.increment,
          node.body,
          true
        )
      );
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
          binaryOp("add", node.variable, node.increment)
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
          binaryOp(node.inclusive ? "leq" : "lt", node.variable, node.high),
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
          block([binaryOp("add", node.variable, node.increment ?? int(1n))]),
          binaryOp(node.inclusive ? "leq" : "lt", node.variable, node.high),
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
      node.high.type === "UnaryOp" &&
      node.high.op === "cardinality" &&
      node.high.arg.type === "Identifier"
    ) {
      const collection = node.high.arg;
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
      node.high.type === "UnaryOp" &&
      node.high.op === "cardinality" &&
      node.high.arg.type === "Identifier"
    ) {
      const collection = node.high.arg;
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
  if (node.type !== "ArrayGet" && node.type !== "ListGet") return false;
  const obj = node.type === "ArrayGet" ? node.array : node.list;
  return (
    obj.type === "Identifier" &&
    obj.name === collection &&
    node.index.type === "Identifier" &&
    node.index.name === index
  );
}

function isVariableUsedAlone(path: Path, collection: string, index: string) {
  let result = false;
  path.visit({
    enter(path: Path) {
      const node = path.node;
      if (
        node.type === "Identifier" &&
        node.name === index &&
        !isArrayOrListGet(path.parent!.node, collection, index)
      ) {
        result = true;
      }
    },
  });
  return result;
}
