import { getType } from "../common/getType";
import { integerType, isSubtype, OpCode } from "../IR";
import { Plugin } from "../common/Language";

const textOpsEquivalenceAscii: [OpCode, OpCode][] = [
  ["text_codepoint_find", "text_byte_find"],
  ["text_get_byte", "text_get_codepoint"],
  ["text_codepoint_ord", "text_byte_ord"],
  ["text_codepoint_length", "text_byte_length"],
  ["text_byte_reversed", "text_codepoint_reversed"],
  ["text_get_codepoint_slice", "text_get_byte_slice"],
];

const integerOpsEquivalenceAscii: [OpCode, OpCode][] = [
  ["byte_to_text", "int_to_codepoint"],
];

/** Swaps an op to another one, provided they are equivalent for the subtype. */
export const useEquivalentTextOp: Plugin = {
  name: "useEquivalentTextOp",
  visit(node, spine) {
    if (node.kind !== "PolygolfOp") return;
    const program = spine.root.node;
    const typeArg0 = getType(node.args[0], program);
    if (typeArg0.kind === "text" && typeArg0.isAscii) {
      for (const eqPair of textOpsEquivalenceAscii) {
        if (eqPair.includes(node.op)) {
          return { ...node, op: eqPair[1 - eqPair.indexOf(node.op)] };
        }
      }
    }
    if (isSubtype(typeArg0, integerType(0, 127))) {
      for (const eqPair of integerOpsEquivalenceAscii) {
        if (eqPair.includes(node.op)) {
          return { ...node, op: eqPair[1 - eqPair.indexOf(node.op)] };
        }
      }
    }
  },
};
