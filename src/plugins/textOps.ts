import { getType } from "../common/getType";
import { integerType, isSubtype, OpCode } from "../IR";
import { Plugin } from "../common/Language";

function toBidirectionalMap<T>(pairs: [T, T][]): Map<T, T> {
  return new Map<T, T>([...pairs, ...pairs.map<[T, T]>(([k, v]) => [v, k])]);
}

const textOpsEquivalenceAscii = toBidirectionalMap<OpCode>([
  ["text_codepoint_find", "text_byte_find"],
  ["text_get_codepoint", "text_get_byte"],
  ["text_codepoint_ord", "text_byte_ord"],
  ["text_codepoint_length", "text_byte_length"],
  ["text_codepoint_reversed", "text_byte_reversed"],
  ["text_get_codepoint_slice", "text_get_byte_slice"],
]);

const integerOpsEquivalenceAscii = toBidirectionalMap<OpCode>([
  ["byte_to_text", "int_to_codepoint"],
]);

/** Swaps an op to another one, provided they are equivalent for the subtype. */
export function useEquivalentTextOp(
  useBytes = true,
  useCodepoints = true
): Plugin {
  return {
    name: `useEquivalentTextOp(${useBytes}, ${useCodepoints})`,
    visit(node, spine) {
      if (node.kind !== "PolygolfOp") return;
      const program = spine.root.node;
      if (node.args.length < 1) return;
      const typeArg0 = getType(node.args[0], program);
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
