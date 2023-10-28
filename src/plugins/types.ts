import { PolygolfError } from "../common/errors";
import { getType } from "../common/getType";
import { Plugin } from "../common/Language";
import { int64Type, integerType, isSubtype, Type } from "../IR";

export const assertInt64: Plugin = {
  name: "assertInt64",
  visit(node, spine) {
    if (spine.isRoot) return;
    let type: Type;
    try {
      type = getType(node, spine);
    } catch {
      return; // stuff like builtin identifiers etc. throw
    }
    if (isSubtype(type, integerType()) && !isSubtype(type, int64Type)) {
      throw new PolygolfError(
        `Integer value that doesn't provably fit into a int64 type encountered.`,
        node.source
      );
    }
    return undefined;
  },
};
