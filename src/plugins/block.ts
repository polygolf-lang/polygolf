import {
  Assignment,
  block,
  Expr,
  flipOpCode,
  Identifier,
  isBinary,
  manyToManyAssignment,
  mutatingBinaryOp,
  Node,
  oneToManyAssignment,
  polygolfOp,
  VarDeclaration,
  varDeclarationBlock,
  VarDeclarationWithAssignment,
  varDeclarationWithAssignment,
} from "../IR";
import { Plugin } from "../common/Language";
import { Spine } from "@/common/Spine";
import { stringify } from "@/common/applyLanguage";

/**
 * Collects neighbouring block children matching a predicate and replaces the with a different set of children.
 * @param collectPredicate Condition for expr to be collected.
 * @param transform Transforming function.
 */
export function blockChildrenCollectAndReplace<T = Expr>(
  name: string,
  collectPredicate: (expr: Expr, spine: Spine<Expr>, previous: T[]) => boolean,
  transform: (exprs: T[]) => Expr[]
): Plugin {
  return {
    name,
    visit(node, spine) {
      if (node.kind === "Block") {
        const newNodes: Expr[] = [];
        let changed = false;
        let collected: T[] = [];
        for (const childSpine of spine.getChildSpines()) {
          const expr = childSpine.node as Expr;
          if (collectPredicate(expr, childSpine as Spine<Expr>, collected)) {
            changed = true;
            collected.push(expr as any as T);
          } else if (collectPredicate(expr, childSpine as Spine<Expr>, [])) {
            newNodes.push(...transform(collected));
            collected = [expr as any as T];
          } else {
            newNodes.push(...transform(collected));
            collected = [];
            newNodes.push(expr);
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

const declared: Set<string> = new Set<string>();
export const addVarDeclarations: Plugin = {
  name: "addVarDeclarations",
  visit(node) {
    if (node.kind === "Program") declared.clear();
    else if (node.kind === "Assignment") {
      if (
        node.variable.kind === "Identifier" &&
        !declared.has(node.variable.name)
      ) {
        declared.add(node.variable.name);
        return varDeclarationWithAssignment(node);
      }
    }
  },
};

function stringifyRightSide(
  x: Assignment | VarDeclarationWithAssignment<Assignment>
): string {
  if (x.kind === "Assignment") return stringify(x.expr);
  return stringify(x.assignment.expr);
}

export const addOneToManyAssignments = blockChildrenCollectAndReplace<
  Assignment | VarDeclarationWithAssignment<Assignment>
>(
  "addOneToManyAssignments",
  (expr, spine, previous) =>
    (expr.kind === "Assignment" ||
      (expr.kind === "VarDeclarationWithAssignment" &&
        expr.assignment.kind === "Assignment")) &&
    (previous.length < 1 ||
      (previous[0].kind === expr.kind &&
        stringifyRightSide(
          expr as Assignment | VarDeclarationWithAssignment<Assignment>
        ) === stringifyRightSide(previous[0]))),
  (exprs) => [
    exprs[0].kind === "Assignment"
      ? oneToManyAssignment(
          exprs.map((x) => (x as Assignment).variable),
          exprs[0].expr
        )
      : varDeclarationWithAssignment(
          oneToManyAssignment(
            exprs.map(
              (x) =>
                (x as VarDeclarationWithAssignment<Assignment>).assignment
                  .variable
            ),
            exprs[0].assignment.expr
          )
        ),
  ]
);

function referencesVariable(spine: Spine<Expr>, variable: Identifier): boolean {
  return spine.someNode(
    (x) => x.kind === "Identifier" && !x.builtin && x.name === variable.name
  );
}

export const addManyToManyAssignments = blockChildrenCollectAndReplace<
  Assignment | VarDeclarationWithAssignment<Assignment>
>(
  "addManyToManyAssignments",
  (expr, spine, previous) => {
    const previousAssignments = previous.map((x) =>
      x.kind === "Assignment" ? x : x.assignment
    );
    return (
      ((expr.kind === "Assignment" && expr.variable.kind === "Identifier") ||
        (expr.kind === "VarDeclarationWithAssignment" &&
          expr.assignment.kind === "Assignment" &&
          expr.assignment.variable.kind === "Identifier")) &&
      (previous.length < 1 || previous[0].kind === expr.kind) &&
      !previousAssignments.some((pendingAssignment) =>
        referencesVariable(spine, pendingAssignment.variable as Identifier)
      )
    );
  },
  (exprs) => [
    exprs[0].kind === "Assignment"
      ? manyToManyAssignment(
          exprs.map((x) => (x as Assignment).variable),
          exprs.map((x) => (x as Assignment).expr)
        )
      : varDeclarationWithAssignment(
          manyToManyAssignment(
            exprs.map(
              (x) =>
                (x as VarDeclarationWithAssignment<Assignment>).assignment
                  .variable
            ),
            exprs.map(
              (x) =>
                (x as VarDeclarationWithAssignment<Assignment>).assignment.expr
            )
          )
        ),
  ]
);

export const groupVarDeclarations = blockChildrenCollectAndReplace<
  VarDeclaration | VarDeclarationWithAssignment
>(
  "groupVarDeclarations",
  (expr) =>
    expr.kind === "VarDeclaration" ||
    expr.kind === "VarDeclarationWithAssignment",
  (exprs) => [varDeclarationBlock(exprs)]
);
