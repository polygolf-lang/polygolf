import {
  block,
  Expr,
  flipOpCode,
  isBinary,
  mutatingBinaryOp,
  polygolfOp,
} from "../IR";
import { Plugin } from "../common/Language";
import { Spine } from "@/common/Spine";

/**
 * Collects neighbouring block children matching a predicate and replaces the with a different set of children.
 * @param statementFilter Condition for expr to be collected.
 * @param transform Transforming function.
 */
export function blockChildrenCollectAndReplace(
  name: string,
  collectPredicate: (
    previous: Expr[],
    expr: Expr,
    spine: Spine<Expr>
  ) => boolean,
  transform: (exprs: Expr[]) => Expr[]
): Plugin {
  return {
    name,
    visit(node, spine) {
      if (node.kind === "Block") {
        const newNodes: Expr[] = [];
        let changed = false;
        let collected: Expr[] = [];
        for (const childSpine of spine.getChildSpines()) {
          const expr = childSpine.node as Expr;
          if (childrenFilter(expr, childSpine as Spine<Expr>)) {
            changed = true;
            collected.push(expr);
          } else {
            newNodes.push(...transform(collected));
            collected = [expr];
          }
        }
        if (collected.length > 0) {
          newNodes.push(...transform(collected));
        }
        if (changed) return block(newNodes);
      }
    },
  };
}

export const useOneToManyAssignment = blockChildrenCollectAndReplace(
  "useOneToManyAssignment",
  (x) => x.kind === "Assignment"
);
