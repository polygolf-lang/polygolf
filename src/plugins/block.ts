import {
  Assignment,
  Block,
  block,
  Expr,
  Identifier,
  manyToManyAssignment,
  Node,
  oneToManyAssignment,
  VarDeclaration,
  varDeclarationBlock,
  VarDeclarationWithAssignment,
  varDeclarationWithAssignment,
} from "../IR";
import { Plugin } from "../common/Language";
import { Spine } from "../common/Spine";
import { stringify } from "../common/stringify";

/**
 * Collects neighbouring block children matching a predicate and replaces them with a different set of children.
 * @param collectPredicate Condition for expr to be collected.
 * @param transform Transforming function.
 * @param blockPredicate Condition for block to consider its children.
 */
export function blockChildrenCollectAndReplace<T extends Expr = Expr>(
  name: string,
  collectPredicate: (expr: Expr, spine: Spine<Expr>, previous: T[]) => boolean,
  transform: (exprs: T[]) => Expr[],
  blockPredicate: (block: Block, spine: Spine<Block>) => boolean = () => true,
  transformPredicate: (exprs: T[]) => boolean = (exprs: T[]) => exprs.length > 1
): Plugin {
  return {
    name,
    visit(node, spine) {
      if (
        node.kind === "Block" &&
        blockPredicate(node, spine as Spine<Block>)
      ) {
        const newNodes: Expr[] = [];
        let changed = false;
        let collected: T[] = [];
        for (const childSpine of spine.getChildSpines()) {
          const expr = childSpine.node as Expr;
          if (collectPredicate(expr, childSpine as Spine<Expr>, collected)) {
            collected.push(expr as any as T);
          } else if (collectPredicate(expr, childSpine as Spine<Expr>, [])) {
            if (transformPredicate(collected)) {
              newNodes.push(...transform(collected));
              changed = true;
            } else {
              newNodes.push(...collected);
            }
            collected = [expr as any as T];
          } else {
            if (transformPredicate(collected)) {
              newNodes.push(...transform(collected));
              changed = true;
            } else {
              newNodes.push(...collected);
            }
            collected = [];
            newNodes.push(expr);
          }
        }
        if (transformPredicate(collected)) {
          newNodes.push(...transform(collected));
          changed = true;
        } else {
          newNodes.push(...collected);
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

/**
 * Replaces `v1 = c; v2 = c; ... ; vn = c` with `v1,v2,...vn=c`
 */
export function addOneToManyAssignments(
  blockPredicate: (block: Block, spine: Spine<Block>) => boolean = () => true
): Plugin {
  return blockChildrenCollectAndReplace<Assignment<Identifier>>(
    "addOneToManyAssignments",
    (expr, spine, previous) =>
      isAssignmentToIdentifier(expr) &&
      previous.every((x) => x.variable.name !== expr.variable.name) &&
      (previous.length < 1 ||
        stringify(expr.expr) === stringify(previous[0].expr)),
    (exprs) => [
      oneToManyAssignment(
        exprs.map((x) => x.variable),
        exprs[0].expr
      ),
    ],
    blockPredicate
  );
}

/**
 * Replaces `var v1 = c; var v2 = c; ... ; var vn = c` with `var v1,v2,...vn=c`
 */
export function addVarDeclarationOneToManyAssignments(
  blockPredicate: (block: Block, spine: Spine<Block>) => boolean = () => true
): Plugin {
  return blockChildrenCollectAndReplace<
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
    ],
    blockPredicate
  );
}

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
export function addManyToManyAssignments(
  blockPredicate: (block: Block, spine: Spine<Block>) => boolean = () => true
): Plugin {
  return blockChildrenCollectAndReplace<Assignment<Identifier>>(
    "addManyToManyAssignments",
    (expr, spine, previous) =>
      isAssignmentToIdentifier(expr) &&
      !previous.some((x) => referencesVariable(spine, x.variable)),
    (exprs) => [
      manyToManyAssignment(
        exprs.map((x) => x.variable),
        exprs.map((x) => x.expr)
      ),
    ],
    blockPredicate
  );
}

/**
 * Replaces `var v1 = e1; var v2 = e2; ... ; var vn = en` with `var (v1,v2,...vn)=(e1,e2,...,en)`
 */
export function addVarDeclarationManyToManyAssignments(
  blockPredicate: (block: Block, spine: Spine<Block>) => boolean = () => true
): Plugin {
  return blockChildrenCollectAndReplace<
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
    ],
    blockPredicate
  );
}

export function groupVarDeclarations(
  blockPredicate: (block: Block, spine: Spine<Block>) => boolean = () => true,
  transformPredicate: (collected: Expr[]) => boolean = (collected: Expr[]) =>
    collected.length > 1
): Plugin {
  return blockChildrenCollectAndReplace<
    VarDeclaration | VarDeclarationWithAssignment
  >(
    "groupVarDeclarations",
    (expr) =>
      expr.kind === "VarDeclaration" ||
      expr.kind === "VarDeclarationWithAssignment",
    (exprs) => [varDeclarationBlock(exprs)],
    blockPredicate,
    transformPredicate
  );
}

export const noStandaloneVarDeclarations: Plugin = {
  name: "noStandaloneVarDeclarations",
  visit(node, spine) {
    if (
      (node.kind === "VarDeclaration" ||
        node.kind === "VarDeclarationWithAssignment") &&
      spine.parent?.node.kind !== "VarDeclarationBlock"
    ) {
      return varDeclarationBlock([node]);
    }
  },
};

export const tempVarToMultipleAssignment: Plugin = {
  name: "tempVarToMultipleAssignment",
  visit(node) {
    if (node.kind === "Block") {
      const newNodes: Expr[] = [];
      let changed = false;
      for (let i = 0; i < node.children.length; i++) {
        const a = node.children[i];
        if (i >= node.children.length - 2) {
          newNodes.push(a);
          continue;
        }
        const b = node.children[i + 1];
        const c = node.children[i + 2];
        if (
          a.kind === "Assignment" &&
          b.kind === "Assignment" &&
          c.kind === "Assignment" &&
          b.expr.kind === "Identifier" &&
          c.variable.kind === "Identifier" &&
          b.expr.name === c.variable.name &&
          c.expr.kind === "Identifier" &&
          a.variable.kind === "Identifier" &&
          c.expr.name === a.variable.name
        ) {
          newNodes.push(
            manyToManyAssignment([b.variable, c.variable], [b.expr, a.expr])
          );
          changed = true;
          i += 2;
        } else {
          newNodes.push(a);
        }
      }
      if (changed) return block(newNodes);
    }
  },
};
