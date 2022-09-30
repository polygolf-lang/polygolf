import { Path } from "../common/traverse";
import { int, polygolfOp } from "../IR";

/**
 * Convert all indexing (ListGet, ArrayGet) to be one-indexed by adding 1
 * to the index.
 */
export const oneIndexed = {
  enter(path: Path) {
    const node = path.node;
    if (
      (node.type === "StringGetByte" ||
        node.type === "ListGet" ||
        node.type === "ArrayGet" ||
        node.type === "ListSet" ||
        node.type === "ArraySet") &&
      !node.oneIndexed
    ) {
      path.replaceChild(polygolfOp("add", node.index, int(1n)), "index");
      node.oneIndexed = true;
    }
  },
};
