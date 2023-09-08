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
  OpCode,
  TextLiteral,
  ListConstructor,
  ForRange,
  forDifferenceRange,
  isPolygolfOp,
  isSubtype,
  integerType,
  add1,
  sub1,
} from "../IR";
import { byteLength, charLength } from "../common/objective";
import { PolygolfError } from "../common/errors";

export function forRangeToForRangeInclusive(skip1Step = false): Plugin {
  return {
    name: `forRangeToForRangeInclusive(${skip1Step ? "true" : "false"})`,
    visit(node) {
      if (
        node.kind === "ForRange" &&
        !node.inclusive &&
        (!skip1Step || !isIntLiteral(node.increment, 1n))
      )
        return forRange(
          node.variable,
          node.start,
          sub1(node.end),
          node.increment,
          node.body,
          true
        );
    },
  };
}

export const forRangeToWhile: Plugin = {
  name: "forRangeToWhile",
  visit(node, spine) {
    if (node.kind === "ForRange" && node.variable !== undefined) {
      const low = getType(node.start, spine);
      const high = getType(node.end, spine);
      if (low.kind !== "integer" || high.kind !== "integer") {
        throw new Error(`Unexpected type (${low.kind},${high.kind})`);
      }
      const increment = assignment(
        node.variable,
        polygolfOp("add", node.variable, node.increment)
      );
      return block([
        assignment(node.variable, node.start),
        whileLoop(
          polygolfOp(node.inclusive ? "leq" : "lt", node.variable, node.end),
          block([node.body, increment])
        ),
      ]);
    }
  },
};

export const forRangeToForCLike: Plugin = {
  name: "forRangeToForCLike",
  visit(node, spine) {
    if (node.kind === "ForRange" && node.variable !== undefined) {
      const low = getType(node.start, spine);
      const high = getType(node.end, spine);
      if (low.kind !== "integer" || high.kind !== "integer") {
        throw new Error(`Unexpected type (${low.kind},${high.kind})`);
      }
      return forCLike(
        assignment(node.variable, node.start),
        polygolfOp(node.inclusive ? "leq" : "lt", node.variable, node.end),
        assignment(
          node.variable,
          polygolfOp("add", node.variable, node.increment)
        ),
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
      node.variable !== undefined &&
      !node.inclusive &&
      isIntLiteral(node.start, 0n) &&
      isPolygolfOp(node.end, "list_length") &&
      node.end.args[0].kind === "Identifier"
    ) {
      const variable = node.variable;
      const collection = node.end.args[0];
      const elementIdentifier = id(variable.name + "+each");
      const newBody = spine.getChild("body").withReplacer((innerNode) => {
        if (isListGet(innerNode, collection.name, variable.name))
          return elementIdentifier;
      }).node as IR.Expr;
      return forEachPair(variable, elementIdentifier, collection, newBody);
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
        node.variable !== undefined &&
        !node.inclusive &&
        isIntLiteral(node.start, 0n) &&
        ((isPolygolfOp(node.end) &&
          ops.includes(lengthOpToGetOp.get(node.end.op) as any) &&
          node.end.args[0].kind === "Identifier") ||
          isIntLiteral(node.end))
      ) {
        const indexVar = node.variable;
        const bodySpine = spine.getChild("body") as Spine<Expr>;
        const knownLength = isIntLiteral(node.end)
          ? Number(node.end.value)
          : undefined;
        const allowedOps = isIntLiteral(node.end)
          ? ops
          : [lengthOpToGetOp.get(node.end.op) as GetOp];
        const collectionVar = isIntLiteral(node.end)
          ? undefined
          : (node.end.args[0] as Identifier);
        const indexedCollection = getIndexedCollection(
          bodySpine,
          indexVar,
          allowedOps,
          knownLength,
          collectionVar
        );
        if (indexedCollection !== null) {
          const elementIdentifier = id(node.variable.name + "+each");
          const newBody = bodySpine.withReplacer((n) => {
            if (
              isPolygolfOp(n) &&
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
      (collection.kind === "TextLiteral" ||
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
  expr: TextLiteral | ListConstructor,
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

export function forArgvToForRange(overshoot = true, inclusive = false): Plugin {
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
          overshoot
            ? inclusive
              ? sub1(int(node.argcUpperBound))
              : int(node.argcUpperBound)
            : polygolfOp("argc"),
          int(1),
          newBody,
          inclusive
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
            throw new PolygolfError(
              "Only a single for_argv node allowed.",
              node.source
            );
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
        throw new PolygolfError(
          "Node for_argv only allowed at the top level.",
          node.source
        );
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
      node.variable !== undefined &&
      isIntLiteral(node.increment, 1n) &&
      spine.someNode(
        (x) =>
          isPolygolfOp(x, "add") &&
          isIntLiteral(x.args[0], 1n) &&
          isIdent(x.args[1], node.variable!)
      )
    ) {
      const bodySpine = spine.getChild("body");
      const newVar = id(node.variable.name + "+shift");
      const newBodySpine = bodySpine.withReplacer((x) =>
        newVar !== undefined && isIdent(x, node.variable!)
          ? sub1(newVar)
          : undefined
      );
      return forRange(
        newVar,
        add1(node.start),
        add1(node.end),
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

export function forRangeToForDifferenceRange(
  transformPredicate: (
    expr: ForRange,
    spine: Spine<ForRange>
  ) => boolean = () => true
): Plugin {
  return {
    name: "forRangeToForDifferenceRange",
    visit(node, spine) {
      if (
        node.kind === "ForRange" &&
        node.variable !== undefined &&
        transformPredicate(node, spine as Spine<ForRange>)
      ) {
        return forDifferenceRange(
          node.variable,
          node.start,
          polygolfOp("sub", node.end, node.start),
          node.increment,
          node.body,
          node.inclusive
        );
      }
    },
  };
}

export const forRangeToForRangeOneStep: Plugin = {
  name: "forRangeToForRangeOneStep",
  visit(node, spine) {
    if (
      node.kind === "ForRange" &&
      node.variable !== undefined &&
      isSubtype(getType(node.increment, spine.root.node), integerType(2n))
    ) {
      const newVar = id(node.variable.name + "+1step");
      return forRange(
        newVar,
        int(0n),
        node.inclusive
          ? polygolfOp(
              "div",
              polygolfOp("sub", node.end, node.start),
              node.increment
            )
          : add1(
              polygolfOp(
                "div",
                polygolfOp("sub", sub1(node.end), node.start),
                node.increment
              )
            ),
        int(1n),
        block([
          assignment(
            node.variable,
            polygolfOp(
              "add",
              polygolfOp("mul", newVar, node.increment),
              node.start
            )
          ),
          node.body,
        ]),
        node.inclusive
      );
    }
  },
};

export const removeUnusedForVar: Plugin = {
  name: "removeUnusedForVar",
  visit(node, spine) {
    if (node.kind === "ForRange" && node.variable !== undefined) {
      const variable = node.variable;
      if (spine.everyNode((x) => x === variable || !isIdent(x, variable))) {
        return forRange(
          undefined,
          node.start,
          node.end,
          node.increment,
          node.body,
          node.inclusive
        );
      }
    }
  },
};
