import { getType } from "../common/getType";
import { GolfPlugin } from "../common/Language";
import { Spine } from "../common/Spine";
import { Path, Visitor } from "../common/traverse";
import {
  forRange,
  int,
  assignment,
  whileLoop,
  forCLike,
  block,
  forEachPair,
  forEach,
  id,
  IR,
  polygolfOp,
} from "../IR";

export const forRangeToForRangeInclusive: GolfPlugin = {
  tag: "golf",
  name: "forRangeToForRangeInclusive",
  visit(spine: Spine) {
    const node = spine.node;
    if (node.kind === "ForRange" && !node.inclusive)
      return forRange(
        node.variable,
        node.low,
        polygolfOp("sub", node.high, int(1n)),
        node.increment,
        node.body,
        true
      );
  },
};

export const useInclusiveForRange: GolfPlugin = {
  tag: "golf",
  name: "useInclusiveForRange",
  visit(spine: Spine): IR.ForRange | undefined {
    const node = spine.node;
    if (node.kind === "ForRange" && !node.inclusive) {
      if (node.high.kind === "IntegerLiteral") {
        const high = {
          ...node.high,
          value: node.high.value - 1n,
        };
        return {
          ...node,
          inclusive: true,
          high,
        };
      } else if (node.high.kind === "BinaryOp" && node.high.op === "add") {
        if (
          node.high.right.kind === "IntegerLiteral" &&
          node.high.right.value === 1n
        ) {
          return {
            ...node,
            inclusive: true,
            high: node.high.left,
          };
        } else if (
          node.high.left.kind === "IntegerLiteral" &&
          node.high.left.value === 1n
        ) {
          return {
            ...node,
            inclusive: true,
            high: node.high.right,
          };
        }
      }
    }
  },
};

export const forRangeToWhile: GolfPlugin = {
  tag: "golf",
  name: "forRangeToWhile",
  visit(spine: Spine) {
    const node = spine.node;
    if (node.kind === "ForRange") {
      const low = getType(node.low, spine.root.node);
      const high = getType(node.high, spine.root.node);
      if (low.kind !== "integer" || high.kind !== "integer") {
        throw new Error(`Unexpected type (${low.kind},${high.kind})`);
      }
      const increment = assignment(
        node.variable,
        polygolfOp("add", node.variable, node.increment)
      );
      return block([
        assignment(node.variable, node.low),
        whileLoop(
          polygolfOp(node.inclusive ? "leq" : "lt", node.variable, node.high),
          node.body.kind === "Block"
            ? block([...node.body.children, increment])
            : block([node.body, increment])
        ),
      ]);
    }
  },
};

export const forRangeToForCLike: GolfPlugin = {
  tag: "golf",
  name: "forRangeToForCLike",
  visit(spine: Spine) {
    const node = spine.node;
    if (node.kind === "ForRange") {
      const low = getType(node.low, spine.root.node);
      const high = getType(node.high, spine.root.node);
      if (low.kind !== "integer" || high.kind !== "integer") {
        throw new Error(`Unexpected type (${low.kind},${high.kind})`);
      }
      return forCLike(
        assignment(node.variable, node.low),
        assignment(
          node.variable,
          polygolfOp("add", node.variable, node.increment ?? int(1n))
        ),
        polygolfOp(node.inclusive ? "leq" : "lt", node.variable, node.high),
        node.body
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
export const forRangeToForEachPair: Visitor = {
  tag: "mutatingVisitor",
  name: "forRangeToForEachPair",
  enter(path: Path) {
    const node = path.node;
    if (
      node.kind === "ForRange" &&
      !node.inclusive &&
      node.low.kind === "IntegerLiteral" &&
      node.low.value === 0n &&
      node.high.kind === "PolygolfOp" &&
      node.high.op === "list_length" &&
      node.high.args[0].kind === "Identifier"
    ) {
      const collection = node.high.args[0];
      const elementIdentifier = id(path.getNewIdentifier());
      const bodyPath = new Path(node.body, path, "body");
      bodyPath.visit({
        tag: "mutatingVisitor",
        // inside the body, replace each `collection`[`node.variable`] with `elementIdentifier`
        name: "anonymous",
        enter(path2: Path) {
          const node2 = path2.node;
          if (isListGet(node2, collection.name, node.variable.name)) {
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
export const forRangeToForEach: Visitor = {
  tag: "mutatingVisitor",
  name: "forRangeToForEach",
  enter(path: Path) {
    const node = path.node;
    if (
      node.kind === "ForRange" &&
      !node.inclusive &&
      node.low.kind === "IntegerLiteral" &&
      node.low.value === 0n &&
      node.high.kind === "PolygolfOp" &&
      node.high.op === "list_length" &&
      node.high.args[0].kind === "Identifier"
    ) {
      const collection = node.high.args[0];
      const elementIdentifier = id(path.getNewIdentifier());
      const bodyPath = new Path(node.body, path, "body");
      if (!isVariableUsedAlone(bodyPath, collection.name, node.variable.name)) {
        // if the loop variable is only used to index the collection
        bodyPath.visit({
          tag: "mutatingVisitor",
          // inside the body, replace each `collection`[`node.variable`] with `elementIdentifier`
          name: "anonymous",
          enter(path2: Path) {
            const node2 = path2.node;
            if (isListGet(node2, collection.name, node.variable.name)) {
              path2.replaceWith(elementIdentifier);
            }
          },
        });
        path.replaceWith(forEach(elementIdentifier, collection, node.body));
      }
    }
  },
};

function isListGet(node: IR.Node, collection: string, index: string) {
  if (node.kind !== "PolygolfOp" || node.op !== "list_get") return false;
  const args = node.args;
  return (
    args[0].kind === "Identifier" &&
    args[0].name === collection &&
    args[1].kind === "Identifier" &&
    args[1].name === index
  );
}

function isVariableUsedAlone(path: Path, collection: string, index: string) {
  return path.anyNode(
    (x) =>
      x.node.kind === "Identifier" &&
      x.node.name === index &&
      !isListGet(x.parent!.node, collection, index)
  );
}
