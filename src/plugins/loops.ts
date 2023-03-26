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
  Node,
  isIntLiteral,
} from "../IR";
import { add1, sub1 } from "./ops";

export const forRangeToForRangeInclusive: Plugin = {
  name: "forRangeToForRangeInclusive",
  visit(node) {
    if (node.kind === "ForRange" && !node.inclusive)
      return forRange(
        node.variable,
        node.low,
        sub1(node.high),
        node.increment,
        node.body,
        true
      );
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
          block([node.body, increment])
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

export const forArgvToForEach: Plugin = {
  name: "forArgvToForEach",
  visit(node) {
    if (node.kind === "ForArgv") {
      return forEach(node.variable, polygolfOp("argv"), node.body);
    }
  },
};

export function forArgvToForRange(overshoot = true): Plugin {
  return {
    name: `forArgvToForRange(${overshoot ? "" : "false"})`,
    visit(node) {
      if (node.kind === "ForArgv") {
        const indexVar = id(node.variable.name + "+index");
        const newBody = block([
          assignment(node.variable, polygolfOp("argv_get", indexVar)),
          node.body,
        ]);
        return forRange(
          indexVar,
          int(0),
          overshoot ? int(node.argcUpperBound) : polygolfOp("argc"),
          int(1),
          newBody
        );
      }
    },
  };
}

export const assertForArgvTopLevel: Plugin = {
  name: "assertForArgvTopLevel",
  visit(node, spine) {
    if (node.kind === "Program") {
      let forArgvSeen = false;
      for (const kind of spine.compactMap((x) => x.kind)) {
        if (kind === "ForArgv") {
          if (forArgvSeen)
            throw new Error("Only a single for_argv node allowed.");
          forArgvSeen = true;
        }
      }
    }
    if (node.kind === "ForArgv") {
      if (
        spine.parent?.node.kind !== "Program" &&
        (spine.parent?.node.kind !== "Block" ||
          spine.parent?.parent?.node.kind !== "Program")
      ) {
        throw new Error("Node for_argv only allowed at the top level.");
      }
    }
    return undefined;
  },
};

export const shiftRangeOneUp: Plugin = {
  name: "shiftRangeOneUp",
  visit(node, spine) {
    if (node.kind === "ForRange" && isIntLiteral(node.increment, 1n)) {
      const bodySpine = new Spine(node.body, spine, "body");
      const newVar = id(node.variable.name + "POLYGOLFshifted");
      const newBodySpine = bodySpine.withReplacer((x) =>
        isIdent(x, node.variable) ? sub1(newVar) : undefined
      );
      return forRange(
        newVar,
        add1(node.low),
        add1(node.high),
        int(1n),
        newBodySpine.node as Expr,
        node.inclusive
      );
    }
  },
};

function isIdent(node: Node, ident: Identifier): node is Identifier {
  return (
    node.kind === "Identifier" &&
    node.name === ident.name &&
    node.builtin === ident.builtin
  );
}
