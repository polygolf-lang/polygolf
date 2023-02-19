import {
  Assignment,
  block,
  Expr,
  flipOpCode,
  Identifier,
  isBinary,
  LValue,
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

/**
 * Replaces `v1 = c; v2 = c; ... ; vn = c` with `v1,v2,...vn=c`
 */
export const addOneToManyAssignments = blockChildrenCollectAndReplace<
  Assignment<Identifier>
>(
  "addOneToManyAssignments",
  (expr, spine, previous) =>
    isAssignmentToIdentifier(expr) &&
    (previous.length < 1 ||
      stringify(expr.expr) === stringify(previous[0].expr)),
  (exprs) => [
    oneToManyAssignment(
      exprs.map((x) => x.variable),
      exprs[0].expr
    ),
  ]
);

/**
 * Replaces `var v1 = c; var v2 = c; ... ; var vn = c` with `var v1,v2,...vn=c`
 */
export const addVarDeclarationOneToManyAssignments =
  blockChildrenCollectAndReplace<
    VarDeclarationWithAssignment<Assignment<Identifier>>
  >(
    "addVarDeclarationOneToManyAssignments",
    (expr, spine, previous) =>
      expr.kind === "VarDeclarationWithAssignment" &&
      isAssignmentToIdentifier(expr.assignment) &&
      (previous.length < 1 ||
        stringify(expr.assignment.expr) ===
          stringify(previous[0].assignment.expr)),
    (exprs) => [
      varDeclarationWithAssignment(
        oneToManyAssignment(
          exprs.map((x) => x.assignment.variable),
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

function isAssignment(x: Node): x is Assignment {
  return x.kind === "Assignment";
}
function isAssignmentToIdentifier(x: Node): x is Assignment<Identifier> {
  return isAssignment(x) && x.variable.kind === "Identifier";
}

/**
 * Replaces `v1 = e1; v2 = e2; ... ; vn = en` with `(v1,v2,...vn)=(e1,e2,...,en)`
 */
export const addManyToManyAssignments = blockChildrenCollectAndReplace<
  Assignment<Identifier>
>(
  "addManyToManyAssignments",
  (expr, spine, previous) =>
    isAssignmentToIdentifier(expr) &&
    !previous.some((x) => referencesVariable(spine, x.variable)),
  (exprs) => [
    manyToManyAssignment(
      exprs.map((x) => x.variable),
      exprs.map((x) => x.expr)
    ),
  ]
);

/**
 * Replaces `var v1 = e1; var v2 = e2; ... ; var vn = en` with `var (v1,v2,...vn)=(e1,e2,...,en)`
 */
export const addVarDeclarationManyToManyAssignments =
  blockChildrenCollectAndReplace<
    VarDeclarationWithAssignment<Assignment<Identifier>>
  >(
    "addVarDeclarationManyToManyAssignments",
    (expr, spine, previous) =>
      expr.kind === "VarDeclarationWithAssignment" &&
      isAssignmentToIdentifier(expr.assignment) &&
      !previous.some((x) => referencesVariable(spine, x.assignment.variable)),
    (exprs) => [
      varDeclarationWithAssignment(
        manyToManyAssignment(
          exprs.map((x) => x.assignment.variable),
          exprs.map((x) => x.assignment.expr)
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
