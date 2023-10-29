import { getType } from "../common/getType";
import {
  integerType,
  isPolygolfOp,
  isSubtype,
  isTextLiteral,
  type OpCode,
  polygolfOp,
  int,
} from "../IR";
import { type Plugin } from "../common/Language";
import { mapOps } from "./ops";
import { charLength } from "../common/strings";

function toBidirectionalMap<T>(pairs: [T, T][]): Map<T, T> {
  return new Map<T, T>([...pairs, ...pairs.map<[T, T]>(([k, v]) => [v, k])]);
}

const textOpsEquivalenceAscii = toBidirectionalMap<OpCode>([
  ["text_codepoint_find", "text_byte_find"],
  ["text_get_codepoint", "text_get_byte"],
  ["text_get_codepoint_to_int", "text_get_byte_to_int"],
  ["text_codepoint_length", "text_byte_length"],
  ["text_codepoint_reversed", "text_byte_reversed"],
  ["text_get_codepoint_slice", "text_get_byte_slice"],
  ["codepoint_to_int", "text_byte_to_int"],
]);

const integerOpsEquivalenceAscii = toBidirectionalMap<OpCode>([
  ["int_to_text_byte", "int_to_codepoint"],
]);

/** Swaps an op to another one, provided they are equivalent for the subtype. */
export function useEquivalentTextOp(
  useBytes = true,
  useCodepoints = true,
): Plugin {
  if (!useBytes && !useCodepoints)
    throw new Error(
      "Programming error. Choose at least one of bytes and codepoints.",
    );
  return {
    name: `useEquivalentTextOp(${useBytes.toString()}, ${useCodepoints.toString()})`,
    visit(node, spine) {
      if (!isPolygolfOp()(node)) return;
      if (node.args.length < 1) return;
      const typeArg0 = getType(node.args[0], spine);
      if (
        (!useBytes && node.op.includes("codepoint")) ||
        (!useCodepoints && node.op.includes("byte"))
      )
        return;
      if (typeArg0.kind === "text" && typeArg0.isAscii) {
        const alternative = textOpsEquivalenceAscii.get(node.op);
        if (alternative !== undefined) return { ...node, op: alternative };
      }
      if (isSubtype(typeArg0, integerType(0, 127))) {
        const alternative = integerOpsEquivalenceAscii.get(node.op);
        if (alternative !== undefined) return { ...node, op: alternative };
      }
    },
  };
}

export const textGetToIntToTextGet: Plugin = {
  ...mapOps(
    [
      "text_get_byte_to_int",
      (x) => polygolfOp("text_byte_to_int", polygolfOp("text_get_byte", ...x)),
    ],
    [
      "text_get_codepoint_to_int",
      (x) =>
        polygolfOp("codepoint_to_int", polygolfOp("text_get_codepoint", ...x)),
    ],
  ),
  name: "textGetToIntToTextGet",
};

export const textToIntToTextGetToInt: Plugin = {
  ...mapOps(
    [
      "text_byte_to_int",
      (x) =>
        isPolygolfOp("text_get_byte")(x[0])
          ? polygolfOp("text_get_byte_to_int", ...x[0].args)
          : undefined,
    ],
    [
      "codepoint_to_int",
      (x) =>
        isPolygolfOp("text_get_codepoint")(x[0])
          ? polygolfOp("text_get_codepoint_to_int", ...x[0].args)
          : undefined,
    ],
  ),
  name: "textToIntToTextGetToInt",
};

export const textGetToTextGetToIntToText: Plugin = {
  ...mapOps(
    [
      "text_get_byte",
      (x) =>
        polygolfOp(
          "int_to_text_byte",
          polygolfOp("text_get_byte_to_int", ...x),
        ),
    ],
    [
      "text_get_codepoint",
      (x) =>
        polygolfOp(
          "int_to_codepoint",
          polygolfOp("text_get_codepoint_to_int", ...x),
        ),
    ],
  ),
  name: "textGetToTextGetToIntToText",
};

export const textToIntToFirstIndexTextGetToInt: Plugin = {
  ...mapOps(
    [
      "text_byte_to_int",
      (x) => polygolfOp("text_get_byte_to_int", x[0], int(0n)),
    ],
    [
      "codepoint_to_int",
      (x) => polygolfOp("text_get_codepoint_to_int", x[0], int(0n)),
    ],
  ),
  name: "textToIntToFirstIndexTextGetToInt",
};

/**
 * Converts nested text_replace to a text_multireplace provided the arguments are
 * text literals with no overlap.
 * @param singleCharInputsOnly Only applies the transform if the input args are single characters.
 * This is used in Python. In the future it might can generalised to some general callback filter.
 * @returns
 */
export function useMultireplace(singleCharInputsOnly = false): Plugin {
  return {
    name: "useMultireplace",
    visit(node) {
      const isReplace = isPolygolfOp("text_replace", "text_multireplace");
      if (isReplace(node) && isReplace(node.args[0])) {
        const a = node.args[0].args.slice(1);
        const b = node.args.slice(1);
        if (a.every(isTextLiteral()) && b.every(isTextLiteral())) {
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
            return polygolfOp("text_multireplace", ...node.args[0].args, ...b);
          }
        }
      }
    },
  };
}

export const replaceToSplitAndJoin: Plugin = {
  ...mapOps([
    "text_replace",
    ([x, y, z]) => polygolfOp("join", polygolfOp("text_split", x, y), z),
  ]),
  name: "replaceToSplitAndJoin",
};
