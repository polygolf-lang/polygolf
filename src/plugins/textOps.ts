import { getType } from "../common/getType";
import {
  integerType,
  isPolygolfOp,
  isSubtype,
  OpCode,
  polygolfOp,
} from "../IR";
import { Plugin } from "../common/Language";
import { mapOps } from "./ops";

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

const opsToSwap = [
  ...textOpsEquivalenceAscii.keys(),
  ...integerOpsEquivalenceAscii.keys(),
];

/** Swaps an op to another one, provided they are equivalent for the subtype. */
export function useEquivalentTextOp(
  useBytes = true,
  useCodepoints = true
): Plugin {
  if (!useBytes && !useCodepoints)
    throw new Error(
      "Programming error. Choose at least one of bytes and codepoints."
    );
  return {
    name: `useEquivalentTextOp(${useBytes.toString()}, ${useCodepoints.toString()})`,
    visit(node, spine) {
      if (isPolygolfOp(node, ...opsToSwap)) {
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
      }
    },
  };
}

export const textGetToIntToTextGet: Plugin = {
  ...mapOps([
    [
      "text_get_byte_to_int",
      (x) => polygolfOp("text_byte_to_int", polygolfOp("text_get_byte", ...x)),
    ],
    [
      "text_get_codepoint_to_int",
      (x) =>
        polygolfOp("codepoint_to_int", polygolfOp("text_get_codepoint", ...x)),
    ],
  ]),
  name: "textGetToIntToTextGet",
};

export const textToIntToTextGetToInt: Plugin = {
  ...mapOps([
    [
      "text_byte_to_int",
      (x) =>
        isPolygolfOp(x[0], "text_get_byte")
          ? polygolfOp("text_get_byte_to_int", ...x[0].args)
          : undefined,
    ],
    [
      "codepoint_to_int",
      (x) =>
        isPolygolfOp(x[0], "text_get_codepoint")
          ? polygolfOp("text_get_codepoint_to_int", ...x[0].args)
          : undefined,
    ],
  ]),
  name: "textToIntToTextGetToInt",
};
