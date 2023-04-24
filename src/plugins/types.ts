import { getType } from "../common/getType";
import { Plugin } from "../common/Language";
import { int64Type, integerType, isSubtype, Type } from "../IR";

export const assertInt64: Plugin = {
  name: "assertInt64",
  visit(node, spine) {
    if (node.kind === "Program") return;
    let type: Type;
    try {
      type = getType(node, spine);
    } catch {
      return; // stuff like builtin identifiers etc. throw
    }
    if (isSubtype(type, integerType()) && !isSubtype(type, int64Type)) {
      throw new Error(
        `Integer value that doesn't provably fit into a int64 type encountered.`
      );
    }
    return undefined;
  },
};
