import { Spine } from "../common/Spine";
import { getType } from "../common/getType";
import { Plugin } from "../common/Language";
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
  Expr,
  Identifier,
  PolygolfOp,
  Node,
} from "../IR";
import { add1, sub1 } from "./ops";

export const forRangeToForRangeInclusive: Plugin = {
  name: "forRangeToForRangeInclusive",
  visit(node) {
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

export const useInclusiveForRange: Plugin = {
  name: "useInclusiveForRange",
  visit(node): IR.ForRange | undefined {
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

export const forRangeToWhile: Plugin = {
  name: "forRangeToWhile",
  visit(node, spine) {
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

export const forRangeToForCLike: Plugin = {
  name: "forRangeToForCLike",
  visit(node, spine) {
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
          polygolfOp("add", node.variable, node.increment)
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
export const forRangeToForEachPair: Plugin = {
  name: "forRangeToForEachPair",
  visit(node, spine) {
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
      const elementIdentifier = id(
        node.variable.name + "_forRangeToForEachPair"
      );
      const newBody = spine.getChild("body").withReplacer((innerNode) => {
        if (isListGet(innerNode, collection.name, node.variable.name))
          return elementIdentifier;
      }).node as IR.Expr;
      return forEachPair(node.variable, elementIdentifier, collection, newBody);
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
export const forRangeToForEach: Plugin = {
  name: "forRangeToForEach",
  visit(node, spine) {
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
      const elementIdentifier = id(node.variable.name + "_forRangeToForEach");
      const bodySpine = spine.getChild("body");
      const onlyUsedForCollectionAccess = bodySpine.everyNode(
        (n, s) =>
          n.kind !== "Identifier" ||
          n.name !== node.variable.name ||
          isListGet(s.parent!.node, collection.name, node.variable.name)
      );
      if (onlyUsedForCollectionAccess) {
        // if the loop variable is only used to index the collection
        const newBody = bodySpine.withReplacer((n) => {
          if (isListGet(n, collection.name, node.variable.name))
            return elementIdentifier;
        }).node as IR.Expr;
        return forEach(elementIdentifier, collection, newBody);
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

export const shiftRangeOneUp: Plugin = {
  name: "shiftRangeOneUp",
  visit(node, spine) {
    if (
      node.kind === "ForRange" &&
      node.increment.kind === "IntegerLiteral" &&
      node.increment.value === 1n
    ) {
      const bodySpine = new Spine(node.body, spine, "body");
      if (bodySpine.someNode((x) => isIdentPlus(x, node.variable, true))) {
        const newVar = id(node.variable.name + "POLYGOLFshifted");
        return forRange(
          newVar,
          add1(node.low),
          add1(node.high),
          int(1n),
          bodySpine.withReplacer((x) =>
            isIdentPlus(x, node.variable) || isIdent(x, node.variable)
              ? sub1Replace(x, newVar)
              : undefined
          ).node as Expr,
          node.inclusive
        );
      }
    }
  },
};

function isIdentPlus(
  node: Node,
  ident: Identifier,
  onlyPlus1 = false
): node is PolygolfOp {
  if (
    node.kind === "PolygolfOp" &&
    (node.op === "add" || (node.op === "sub" && !onlyPlus1))
  ) {
    const a = node.args[0];
    const b = node.args[1];
    return (
      (isIdent(a, ident) &&
        b.kind === "IntegerLiteral" &&
        (!onlyPlus1 || b.value === 1n)) ||
      (isIdent(b, ident) &&
        a.kind === "IntegerLiteral" &&
        (!onlyPlus1 || a.value === 1n))
    );
  }
  return false;
}

function isIdent(node: Node, ident: Identifier): node is Identifier {
  return (
    node.kind === "Identifier" &&
    node.name === ident.name &&
    node.builtin === ident.builtin
  );
}

function sub1Replace(
  expr: PolygolfOp | Identifier,
  newIdent: Identifier
): Expr {
  if (expr.kind === "Identifier") return sub1(newIdent);
  const a = expr.args[0];
  const b = expr.args[1];
  if (a.kind === "Identifier") return sub1(polygolfOp(expr.op, newIdent, b));
  return expr.op === "add"
    ? sub1(polygolfOp(expr.op, a, newIdent))
    : add1(polygolfOp(expr.op, a, newIdent));
}
