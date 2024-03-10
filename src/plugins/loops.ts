import type { PluginVisitor, Spine } from "../common/Spine";
import { getType } from "../common/getType";
import { type Plugin } from "../common/Language";
import {
  int,
  assignment,
  whileLoop,
  forCLike,
  block,
  forEach,
  id,
  op,
  type Node,
  isInt,
  isOp,
  isSubtype,
  integerType,
  succ,
  pred,
  isIdent,
  isUserIdent,
  type ForEach,
  isForEachRange,
  type Op,
  type UnaryOpCode,
  type BinaryOpCode,
  implicitConversion,
  isForEachChar,
  isForEachExclRange,
  type Identifier,
  type List,
} from "../IR";
import { PolygolfError } from "../common/errors";
import { mapOps } from "./ops";
import { $ } from "../common/fragments";

export function rangeExclusiveToInclusive(skip1Step = false): Plugin {
  return mapOps({
    range_excl: (a, b, c) =>
      skip1Step && isInt(1n)(c) ? undefined : op.range_incl(a, pred(b), c),
  });
}

export function forRangeToWhile(node: Node, spine: Spine) {
  if (isForEachRange(node) && node.variable !== undefined) {
    const [start, end, step] = node.collection.args;
    const low = getType(start, spine);
    const high = getType(end, spine);
    if (low.kind !== "integer" || high.kind !== "integer") {
      throw new Error(`Unexpected type (${low.kind},${high.kind})`);
    }
    const increment = assignment(node.variable, op.add(node.variable, step));
    return block([
      assignment(node.variable, start),
      whileLoop(
        op[node.collection.op === "range_incl" ? "leq" : "lt"](
          node.variable,
          end,
        ),
        block([node.body, increment]),
      ),
    ]);
  }
}

export function forRangeToForCLike(node: Node, spine: Spine) {
  if (isForEachRange(node)) {
    const [start, end, step] = node.collection.args;
    const low = getType(start, spine);
    const high = getType(end, spine);
    if (low.kind !== "integer" || high.kind !== "integer") {
      throw new Error(`Unexpected type (${low.kind},${high.kind})`);
    }
    const variable = node.variable ?? id();
    return forCLike(
      assignment(variable, start),
      op[node.collection.op === "range_incl" ? "leq" : "lt"](variable, end),
      assignment(variable, op.add(variable, step)),
      node.body,
    );
  }
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
export function forRangeToForEach(node: Node, spine: Spine) {
  if (isForEachExclRange(node) && node.variable !== undefined) {
    const [start, end, step] = node.collection.args;
    if (
      isInt(0n)(start) &&
      isInt(1n)(step) &&
      ((isOp["size[List]"](end) && isIdent()(end.args[0])) || isInt()(end))
    ) {
      const indexVar = node.variable;
      const bodySpine = spine.getChild($.body);
      const knownLength = isInt()(end) ? Number(end.value) : undefined;
      let indexedList: List | Identifier | undefined = isInt()(end)
        ? undefined
        : (end.args[0] as Identifier);
      indexedList ??= (
        spine.firstNode((node) => {
          if (isOp["at[List]"](node)) {
            const collection = node.args[0];
            return (
              collection.kind === "List" &&
              collection.value.length === knownLength!
            );
          }
          return false;
        }) as Op<"at[List]"> | undefined
      )?.args[0] as List | undefined;

      if (indexedList !== undefined) {
        const elementIdentifier = id(node.variable.name + "+each");
        const newBody = bodySpine.withReplacer((n) => {
          if (
            isOp["at[List]"](n) &&
            ((indexedList!.kind === "List" && n.args[0] === indexedList) ||
              (indexedList!.kind === "Identifier" &&
                isUserIdent(indexedList!)(n.args[0]))) &&
            isUserIdent(indexVar.name)(n.args[1])
          )
            return elementIdentifier;
        });
        if (!newBody.someNode(isUserIdent(indexVar))) {
          return forEach(elementIdentifier, indexedList, newBody.node);
        }
      }
    }
  }
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
  if (isForEachRange(node) && node.variable !== undefined) {
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
      const bodySpine = spine.getChild($.body);
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
  transformPredicate: (
    expr: ForEach<Op<"range_excl">>,
    spine: Spine<ForEach<Op<"range_excl">>>,
  ) => boolean = () => true,
): PluginVisitor {
  return function forRangeToForDifferenceRange(node, spine) {
    if (
      isForEachExclRange(node) &&
      node.variable !== undefined &&
      transformPredicate(node as any, spine as any)
    ) {
      const [low, high, step] = node.collection.args;
      return forEach(
        node.variable,
        op.range_diff_excl(low, op.sub(high, low), step),
        node.body,
      );
    }
  };
}

export function forRangeToForRangeOneStep(node: Node, spine: Spine) {
  if (isForEachRange(node) && node.variable !== undefined) {
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

export function forEachToForRange(node: Node) {
  if (
    node.kind === "ForEach" &&
    node.variable !== undefined &&
    !isOp("range_incl", "range_excl", "range_diff_excl")(node.collection)
  ) {
    const variable = id(node.variable.name + "+index");
    if (isForEachChar(node)) {
      return forEach(
        variable,
        op.range_excl(
          int(0n),
          op[node.collection.op.replace("text_to_list", "size") as UnaryOpCode](
            node.collection.args[0],
          ),
          int(1n),
        ),
        block([
          assignment(
            node.variable,
            op[
              node.collection.op.replace("text_to_list", "at") as BinaryOpCode
            ](node.collection.args[0], variable),
          ),
          node.body,
        ]),
      );
    }
    return forEach(
      variable,
      op.range_excl(int(0n), op["size[List]"](node.collection), int(1n)),
      block([
        assignment(node.variable, op["at[List]"](node.collection, variable)),
        node.body,
      ]),
    );
  }
}

export function removeUnusedLoopVar(node: Node, spine: Spine) {
  if (node.kind === "ForEach" && node.variable !== undefined) {
    const variable = node.variable;
    if (!spine.getChild($.body).someNode(isUserIdent(variable))) {
      return forEach(undefined, node.collection, node.body);
    }
  }
}

export function useImplicitForEachChar(char: "byte" | "codepoint" | "Ascii") {
  return function useImplicitForEachChar(node: Node, spine: Spine) {
    if (
      isOp(`text_to_list[${char}]`)(node) &&
      spine.parent?.node.kind === "ForEach" &&
      spine.pathFragment?.prop === "collection"
    ) {
      return implicitConversion(node.op, node.args[0]);
    }
  };
}
