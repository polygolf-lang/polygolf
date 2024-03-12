import {
  isOp,
  isText,
  op,
  int,
  isOpCode,
  isSubtype,
  type Node,
  integerType,
  textType,
  annotate,
  isInt,
} from "../IR";
import { type Plugin } from "../common/Language";
import { mapOps } from "./ops";
import { charLength } from "../common/strings";
import type { Spine, PluginVisitor } from "../common/Spine";
import { getType } from "../common/getType";

/** Implements ascii text op by either byte / codepoint text ops. */
export function usePrimaryTextOps(char: "byte" | "codepoint"): Plugin {
  return {
    name: `usePrimaryTextOps(${JSON.stringify(char)})`,
    visit(node) {
      if (!isOp()(node) || !node.op.includes("[Ascii]")) return;
      const replacement = node.op.replace("[Ascii]", `[${char}]`);
      if (isOpCode(replacement)) {
        return op.unsafe(replacement)(...node.args);
      }
    },
  };
}

/**
 * Converts nested text_replace to a text_multireplace provided the arguments are
 * text literals with no overlap.
 * @param singleCharInputsOnly Only applies the transform if the input args are single characters.
 * This is used in Python. In the future it might can generalised to some general callback filter.
 * @returns
 */
export function useMultireplace(singleCharInputsOnly = false): PluginVisitor {
  return function useMultireplace(node) {
    const isReplace = isOp("replace", "text_multireplace");
    if (isReplace(node) && isReplace(node.args[0])) {
      const a = node.args[0].args.slice(1);
      const b = node.args.slice(1);
      if (a.every(isText()) && b.every(isText())) {
        const aValues = a.map((x) => x.value);
        const bValues = b.map((x) => x.value);
        const aIn = aValues.filter((_, i) => i % 2 === 0);
        const aOut = aValues.filter((_, i) => i % 2 === 1);
        const bIn = bValues.filter((_, i) => i % 2 === 0);
        const bOut = bValues.filter((_, i) => i % 2 === 1);
        const aInSet = new Set(aIn.join());
        const aOutSet = new Set(aOut.join());
        const bInSet = new Set(bIn.join());
        const bOutSet = new Set(bOut.join());
        if (
          (!singleCharInputsOnly ||
            [...aIn, ...bIn].every((x) => charLength(x) === 1)) &&
          ![...aInSet].some((x) => bInSet.has(x)) &&
          ![...bInSet].some((x) => aOutSet.has(x)) &&
          ![...aInSet].some((x) => bOutSet.has(x))
        ) {
          return op.unsafe("text_multireplace")(...node.args[0].args, ...b);
        }
      }
    }
  };
}

export const replaceToSplitAndJoin: Plugin = mapOps({
  replace: (x, y, z) => op.join(op.split(x, y), z),
});

export function startsWithEndsWithToSliceEquality(
  char: "byte" | "codepoint",
): Plugin {
  return {
    name: `startsWithEndsWithToSliceEquality(${JSON.stringify(char)})`,
    visit(node) {
      if (isOp.starts_with(node)) {
        return op["eq[Text]"](
          op[`slice[${char}]`](
            node.args[0],
            int(0),
            op[`size[${char}]`](node.args[1]),
          ),
          node.args[1],
        );
      }
      if (isOp.ends_with(node)) {
        return op["eq[Text]"](
          op[`slice_back[${char}]`](
            node.args[0],
            op.neg(op[`size[${char}]`](node.args[1])),
            op[`size[${char}]`](node.args[1]),
          ),
          node.args[1],
        );
      }
    },
  };
}

export function intToDecToChar(node: Node, spine: Spine) {
  if (isOp.int_to_dec(node)) {
    const [x] = node.args;
    if (isSubtype(getType(x, spine), integerType(0, 9)))
      return op["char[Ascii]"](op.add(x, int(48)));
  }
}

export function charToIntToDec(node: Node, spine: Spine) {
  if (isOp("char[byte]", "char[codepoint]", "char[Ascii]")(node)) {
    const [x] = node.args;
    if (isSubtype(getType(x, spine), integerType(48, 57))) {
      return op.int_to_dec(op.add(x, int(-48)));
    }
  }
}

export function decToIntToOrd(node: Node, spine: Spine) {
  if (isOp.dec_to_int(node)) {
    const [x] = node.args;
    if (isSubtype(getType(x, spine), textType(integerType(1, 1), true))) {
      return annotate(op.add(op["ord[Ascii]"](x), int(-48)), integerType(0, 9));
    }
  }
}

export function ordToDecToInt(node: Node, spine: Spine) {
  if (
    isOp.add(node) &&
    node.args.length === 2 &&
    isInt(-48n)(node.args[0]) &&
    isOp("ord[Ascii]", "ord[byte]", "ord[codepoint]")(node.args[1]) &&
    isSubtype(getType(node, spine), integerType(0, 9))
  ) {
    return annotate(op.dec_to_int(node.args[1].args[0]), integerType(0, 9));
  }
}

export const singleDigitTextConversions = [
  intToDecToChar,
  charToIntToDec,
  decToIntToOrd,
  ordToDecToInt,
];
