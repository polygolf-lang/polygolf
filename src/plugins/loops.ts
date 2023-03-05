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
  OpCode,
  StringLiteral,
  ListConstructor,
} from "../IR";
import { add1, sub1 } from "./ops";
import { byteLength, charLength } from "../common/applyLanguage";

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

/**
 * Python:
 * for i in range(len(collection)):
 *     commands(collection[i])
 *           |
 *           V
 * for x in collection:
 *     commands(x)
 */
type GetOp = OpCode &
  ("array_get" | "list_get" | "text_get_byte" | "text_get_codepoint");
export function forRangeToForEach(...ops: GetOp[]): Plugin {
  if (ops.includes("text_get_byte") && ops.includes("text_get_codepoint"))
    throw new Error(
      "Programming error. Choose only one of 'text_get_byte' && 'text_get_codepoint'."
    );
  const lengthOpToGetOp = new Map([
    ["array_length", "array_get"],
    ["list_length", "list_get"],
    ["text_byte_length", "text_get_byte"],
    ["array_length", "text_get_codepoint"],
  ]);
  return {
    name: "forRangeToForEach",
    visit(node, spine) {
      if (
        node.kind === "ForRange" &&
        !node.inclusive &&
        node.low.kind === "IntegerLiteral" &&
        node.low.value === 0n &&
        ((node.high.kind === "PolygolfOp" &&
          ops.includes(lengthOpToGetOp.get(node.high.op) as any) &&
          node.high.args[0].kind === "Identifier") ||
          node.high.kind === "IntegerLiteral")
      ) {
        const indexVar = node.variable;
        const bodySpine = spine.getChild("body") as Spine<Expr>;
        const knownLength =
          node.high.kind === "IntegerLiteral"
            ? Number(node.high.value)
            : undefined;
        const allowedOps =
          node.high.kind === "IntegerLiteral"
            ? ops
            : [lengthOpToGetOp.get(node.high.op) as GetOp];
        const collectionVar =
          node.high.kind === "IntegerLiteral"
            ? undefined
            : (node.high.args[0] as Identifier);
        const indexedCollection = getIndexedCollection(
          bodySpine,
          indexVar,
          allowedOps,
          knownLength,
          collectionVar
        );
        if (indexedCollection !== null) {
          const elementIdentifier = id(
            node.variable.name + "_POLYGOLFforRangeToForEach"
          );
          const newBody = bodySpine.withReplacer((n) => {
            if (
              n.kind === "PolygolfOp" &&
              n.args[0] === indexedCollection &&
              n.args[1].kind === "Identifier" &&
              !n.args[1].builtin &&
              n.args[1].name === indexVar.name
            )
              return elementIdentifier;
          }).node as IR.Expr;
          return forEach(elementIdentifier, indexedCollection, newBody);
        }
      }
    },
  };
}

/**
 * Returns a single collection descendant that is being indexed into or null.
 * @param spine Root spine.
 * @param indexVar Indexing variable.
 * @param allowedOps Indexing.
 * @param knownLength The allowed length of the collection if it is a literal or of an array type.
 * @param collectionVar The allowed collection variable to be indexed into.
 */
function getIndexedCollection(
  spine: Spine<Expr>,
  indexVar: Identifier,
  allowedOps: GetOp[],
  knownLength?: number,
  collectionVar?: Identifier
): Expr | null {
  let result: Expr | null = null;
  for (const x of spine.compactMap((n, s) => {
    const parent = s.parent!.node;
    if (n.kind !== "Identifier" || n.builtin || n.name !== indexVar.name)
      return undefined;
    if (
      parent.kind !== "PolygolfOp" ||
      !(allowedOps as OpCode[]).includes(parent.op)
    )
      return null;
    const collection = parent.args[0];
    if (
      (collection.kind === "StringLiteral" ||
        collection.kind === "ListConstructor") &&
      literalLength(collection, allowedOps.includes("text_get_byte")) ===
        knownLength
    )
      return collection;
    if (
      collectionVar !== undefined &&
      collection.kind === "Identifier" &&
      collection.name === collectionVar.name &&
      !collection.builtin
    )
      return collection;
    const collectionType = getType(collection, s.root.node);
    if (
      collectionType.kind === "Array" &&
      collectionType.length === knownLength
    )
      return collection;
    return null;
  })) {
    if (x === null || result != null) return null;
    if (result === null) result = x;
  }
  return result;
}

function literalLength(
  expr: StringLiteral | ListConstructor,
  countTextBytes: boolean
): number {
  if (expr.kind === "ListConstructor") return expr.exprs.length;
  return (countTextBytes ? byteLength : charLength)(expr.value);
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
