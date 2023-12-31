import { type Spine } from "../common/Spine";
import { getType } from "../common/getType";
import { type Plugin } from "../common/Language";
import {
  int,
  assignment,
  whileLoop,
  forCLike,
  block,
  forEachPair,
  forEach,
  id,
  type IR,
  op,
  type Node,
  type Identifier,
  isInt,
  type OpCode,
  type Text,
  type List,
  forDifferenceRange,
  isOp,
  isSubtype,
  integerType,
  succ,
  pred,
  isText,
  isIdent,
  isUserIdent,
  type ForEach,
  Op,
} from "../IR";
import { byteLength, charLength } from "../common/strings";
import { PolygolfError } from "../common/errors";

const isRangeOp = isOp("range_excl", "range_incl");
function isForRange(x: Node): x is ForEach<Op<"range_incl" | "range_excl">> {
  return x.kind === "ForEach" && isRangeOp(x.collection);
}

export function forRangeToForRangeInclusive(skip1Step = false): Plugin {
  return {
    name: `forRangeToForRangeInclusive(${skip1Step ? "true" : "false"})`,
    visit(node) {
      if (
        node.kind === "ForRange" &&
        !node.inclusive &&
        (!skip1Step || !isInt(1n)(node.increment))
      )
        return forRange(
          node.variable,
          node.start,
          pred(node.end),
          node.increment,
          node.body,
          true,
        );
    },
  };
}

export function forRangeToWhile(node: Node, spine: Spine) {
  if (node.kind === "ForRange" && node.variable !== undefined) {
    const low = getType(node.start, spine);
    const high = getType(node.end, spine);
    if (low.kind !== "integer" || high.kind !== "integer") {
      throw new Error(`Unexpected type (${low.kind},${high.kind})`);
    }
    const increment = assignment(
      node.variable,
      op.add(node.variable, node.increment),
    );
    return block([
      assignment(node.variable, node.start),
      whileLoop(
        op[node.inclusive ? "leq" : "lt"](node.variable, node.end),
        block([node.body, increment]),
      ),
    ]);
  }
}

export function forRangeToForCLike(node: Node, spine: Spine) {
  if (node.kind === "ForRange") {
    const low = getType(node.start, spine);
    const high = getType(node.end, spine);
    if (low.kind !== "integer" || high.kind !== "integer") {
      throw new Error(`Unexpected type (${low.kind},${high.kind})`);
    }
    const variable = node.variable ?? id();
    return forCLike(
      assignment(variable, node.start),
      op[node.inclusive ? "leq" : "lt"](variable, node.end),
      assignment(variable, op.add(variable, node.increment)),
      node.body,
    );
  }
}

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
export function forRangeToForEachPair(node: Node, spine: Spine) {
  if (
    node.kind === "ForRange" &&
    node.variable !== undefined &&
    !node.inclusive &&
    isInt(0n)(node.start) &&
    isOp("size[List]")(node.end) &&
    isIdent()(node.end.args[0])
  ) {
    const variable = node.variable;
    const collection = node.end.args[0];
    const elementIdentifier = id(variable.name + "+each");
    const newBody = spine.getChild("body").withReplacer((innerNode) => {
      if (isListGet(innerNode, collection.name, variable.name))
        return elementIdentifier;
    }).node;
    return forEachPair(variable, elementIdentifier, collection, newBody);
  }
}

function isListGet(node: IR.Node, collection: string, index: string) {
  return (
    isOp("at[List]")(node) &&
    isIdent(collection)(node.args[0]) &&
    isIdent(index)(node.args[1])
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
type GetOp = OpCode & ("at[Array]" | "at[List]" | "at[byte]" | "at[codepoint]");
export function forRangeToForEach(...ops: GetOp[]): Plugin {
  if (ops.includes("at[byte]") && ops.includes("at[codepoint]"))
    throw new Error(
      "Programming error. Choose only one of 'at[byte]' && 'at[codepoint]'.",
    );
  const lengthOpToGetOp = new Map([
    ["size[Array]", "at[Array]"],
    ["size[List]", "at[List]"],
    ["size[byte]", "at[byte]"],
    ["size[codepoint]", "at[codepoint]"],
  ]);
  return {
    name: "forRangeToForEach",
    visit(node, spine) {
      if (
        node.kind === "ForRange" &&
        node.variable !== undefined &&
        !node.inclusive &&
        isInt(0n)(node.start) &&
        ((isOp()(node.end) &&
          ops.includes(lengthOpToGetOp.get(node.end.op) as any) &&
          isIdent()(node.end.args[0]!)) ||
          isInt()(node.end))
      ) {
        const indexVar = node.variable;
        const bodySpine = spine.getChild("body");
        const knownLength = isInt()(node.end)
          ? Number(node.end.value)
          : undefined;
        const allowedOps = isInt()(node.end)
          ? ops
          : [lengthOpToGetOp.get(node.end.op) as GetOp];
        const collectionVar = isInt()(node.end)
          ? undefined
          : (node.end.args[0] as Identifier);
        const indexedCollection = getIndexedCollection(
          bodySpine,
          indexVar,
          allowedOps,
          knownLength,
          collectionVar,
        );
        if (indexedCollection !== null) {
          const elementIdentifier = id(node.variable.name + "+each");
          const newBody = bodySpine.withReplacer((n) => {
            if (
              isOp()(n) &&
              n.args[0] === indexedCollection &&
              isUserIdent(indexVar.name)(n.args[1]!)
            )
              return elementIdentifier;
          }).node;
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
  spine: Spine<Node>,
  indexVar: Identifier,
  allowedOps: GetOp[],
  knownLength?: number,
  collectionVar?: Identifier,
): Node | null {
  let result: Node | null = null;
  for (const x of spine.compactMap((n, s) => {
    const parent = s.parent!.node;
    if (!isUserIdent(indexVar.name)(n)) return undefined;
    if (!isOp(...allowedOps)(parent)) return null;
    const collection = parent.args[0];
    if (
      (isText()(collection) || collection.kind === "List") &&
      literalLength(collection, allowedOps.includes("at[byte]")) === knownLength
    )
      return collection;
    if (
      collectionVar !== undefined &&
      isUserIdent(collectionVar.name)(collection)
    )
      return collection;
    const collectionType = getType(collection, s.root.node);
    if (
      knownLength !== undefined &&
      collectionType.kind === "Array" &&
      collectionType.length.kind === "integer" &&
      collectionType.length.high + 1n === BigInt(knownLength)
    )
      return collection;
    return null;
  })) {
    if (x === null || result != null) return null;
    if (result === null) result = x;
  }
  return result;
}

function literalLength(expr: Text | List, countTextBytes: boolean): number {
  if (expr.kind === "List") return expr.exprs.length;
  return (countTextBytes ? byteLength : charLength)(expr.value);
}

export function forArgvToForEach(node: Node) {
  if (node.kind === "ForArgv") {
    return forEach(node.variable, op.argv, node.body);
  }
}

export function forArgvToForRange(overshoot = true, inclusive = false): Plugin {
  return {
    name: `forArgvToForRange(${overshoot ? "" : "false"})`,
    visit(node) {
      if (node.kind === "ForArgv") {
        const indexVar = id(node.variable.name + "+index");
        const newBody = block([
          assignment(node.variable, op["at[argv]"](indexVar)),
          node.body,
        ]);
        return forEach(
          indexVar,
          op[inclusive ? "range_incl" : "range_excl"](
            int(0),
            overshoot
              ? inclusive
                ? pred(int(node.argcUpperBound))
                : int(node.argcUpperBound)
              : op.argc,
            int(1),
          ),
          newBody,
        );
      }
    },
  };
}

export function assertForArgvTopLevel(node: Node, spine: Spine) {
  if (spine.isRoot) {
    let forArgvSeen = false;
    for (const kind of spine.compactMap((x) => x.kind)) {
      if (kind === "ForArgv") {
        if (forArgvSeen)
          throw new PolygolfError(
            "Only a single for_argv node allowed.",
            node.source,
          );
        forArgvSeen = true;
      }
    }
  }
  if (node.kind === "ForArgv") {
    if (
      !(
        spine.isRoot ||
        (spine.parent?.node.kind === "Block" && spine.parent.isRoot)
      )
    ) {
      throw new PolygolfError(
        "Node for_argv only allowed at the top level.",
        node.source,
      );
    }
  }
  return undefined;
}

export function shiftRangeOneUp(node: Node, spine: Spine) {
  if (isForRange(node) && node.variable !== undefined) {
    const [low, high, step] = node.collection.args;
    if (
      isInt(1n)(step) &&
      spine.someNode(
        (x) =>
          isOp.add(x) &&
          isInt(1n)(x.args[0]) &&
          isIdent(node.variable!)(x.args[1]),
      )
    ) {
      const bodySpine = spine.getChild("body");
      const newVar = id(node.variable.name + "+shift");
      const newBodySpine = bodySpine.withReplacer((x) =>
        newVar !== undefined && isIdent(node.variable!)(x)
          ? pred(newVar)
          : undefined,
      );
      return forEach(
        newVar,
        op[node.collection.op](succ(low), succ(high), step),
        newBodySpine.node,
      );
    }
  }
}

export function forRangeToForDifferenceRange(
  transformPredicate: (expr: ForEach, spine: Spine<ForEach>) => boolean = () =>
    true,
): Plugin {
  return {
    name: "forRangeToForDifferenceRange",
    visit(node, spine) {
      if (
        isForRange(node) &&
        node.variable !== undefined &&
        transformPredicate(node, spine as Spine<ForEach>)
      ) {
        const [low, high, step] = node.collection.args;
        return forDifferenceRange(
          node.variable,
          low,
          op.sub(high, low),
          step,
          node.body,
          node.collection.op === "range_incl",
        );
      }
    },
  };
}

export function forRangeToForRangeOneStep(node: Node, spine: Spine) {
  if (isForRange(node) && node.variable !== undefined) {
    const [low, high, step] = node.collection.args;
    if (isSubtype(getType(step, spine), integerType(2n))) {
      const newVar = id(node.variable.name + "+1step");
      return forEach(
        newVar,
        op[node.collection.op](
          int(0n),
          node.collection.op === "range_incl"
            ? op.div(op.sub(high, low), step)
            : succ(op.div(op.sub(pred(high), low), step)),
          int(1n),
        ),
        block([
          assignment(node.variable, op.add(op.mul(newVar, step), low)),
          node.body,
        ]),
      );
    }
  }
}

export function removeUnusedForVar(node: Node, spine: Spine) {
  if (node.kind === "ForEach" && node.variable !== undefined) {
    const variable = node.variable;
    if (!spine.getChild("body").someNode(isUserIdent(variable))) {
      return forEach(undefined, node.collection, node.body);
    }
  }
}
