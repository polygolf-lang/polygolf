import { Path } from "../common/traverse";
import { binaryOp, int } from "../IR";

/**
 * Convert all indexing (ListGet, ArrayGet) to be one-indexed by adding 1
 * to the index.
 */
export const oneIndexed = {
  enter(path: Path) {
    const node = path.node;
    if (node.type === "ListGet" || node.type === "ArrayGet") {
      path.replaceChild(binaryOp("add", node.index, int(1n)), "index");
    }
  },
};
