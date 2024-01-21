import { groupby } from "../common/arrays";
import {
  type Assignment,
  type Block,
  block,
  blockOrSingle,
  type Node,
  type Identifier,
  isAssignment,
  isAssignmentToIdent,
  isIdent,
  isUserIdent,
  manyToManyAssignment,
  oneToManyAssignment,
  type VarDeclaration,
  varDeclarationBlock,
  type VarDeclarationWithAssignment,
  varDeclarationWithAssignment,
} from "../IR";
import { type Plugin } from "../common/Language";
import { type Spine } from "../common/Spine";
import { stringify } from "../common/stringify";
import { getWrites, hasSideEffect } from "../common/symbols";
import type { CompilationContext } from "../common/compile";
import { $ } from "../common/fragments";

/**
 * Collects neighbouring block children matching a predicate and replaces them with a different set of children.
 * @param collectPredicate Condition for expr to be collected.
 * @param transform Transforming function.
 * @param blockPredicate Condition for block to consider its children.
 */
export function blockChildrenCollectAndReplace<T extends Node = Node>(
  name: string,
  collectPredicate: (expr: Node, spine: Spine<Node>, previous: T[]) => boolean,
  transform: (exprs: T[]) => Node[],
  blockPredicate: (block: Block, spine: Spine<Block>) => boolean = () => true,
  transformPredicate: (exprs: T[]) => boolean = (exprs: T[]) =>
    exprs.length > 1,
): Plugin {
  return {
    name,
    visit(node, spine) {
      if (
        node.kind === "Block" &&
        blockPredicate(node, spine as Spine<Block>)
      ) {
        const newNodes: Node[] = [];
        let changed = false;
        let collected: T[] = [];
        for (const childSpine of spine.getChildSpines()) {
          const expr = childSpine.node;
          if (collectPredicate(expr, childSpine, collected)) {
            collected.push(expr as any as T);
          } else if (collectPredicate(expr, childSpine, [])) {
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
export function addVarDeclarations(node: Node, spine: Spine) {
  if (spine.isRoot) declared.clear();
  if (node.kind === "Assignment") {
    if (isIdent()(node.variable) && !declared.has(node.variable.name)) {
      declared.add(node.variable.name);
      return varDeclarationWithAssignment(node);
    }
  }
}

/**
 * Replaces `v1 = c; v2 = c; ... ; vn = c` with `v1,v2,...vn=c`
 */
export function addOneToManyAssignments(
  blockPredicate: (block: Block, spine: Spine<Block>) => boolean = () => true,
): Plugin {
  return blockChildrenCollectAndReplace<Assignment<Identifier>>(
    "addOneToManyAssignments",
    (expr, spine, previous) =>
      isAssignmentToIdent()(expr) &&
      previous.every((x) => x.variable.name !== expr.variable.name) &&
      (previous.length < 1 ||
        stringify(expr.expr) === stringify(previous[0].expr)),
    (exprs) => [
      oneToManyAssignment(
        exprs.map((x) => x.variable),
        exprs[0].expr,
      ),
    ],
    blockPredicate,
  );
}

/**
 * Replaces `var v1 = c; var v2 = c; ... ; var vn = c` with `var v1,v2,...vn=c`
 */
export function addVarDeclarationOneToManyAssignments(
  blockPredicate: (block: Block, spine: Spine<Block>) => boolean = () => true,
): Plugin {
  return blockChildrenCollectAndReplace<
    VarDeclarationWithAssignment<Assignment<Identifier>>
  >(
    "addVarDeclarationOneToManyAssignments",
    (expr, spine, previous) =>
      expr.kind === "VarDeclarationWithAssignment" &&
      isAssignmentToIdent()(expr.assignment) &&
      (previous.length < 1 ||
        stringify(expr.assignment.expr) ===
          stringify(previous[0].assignment.expr)),
    (exprs) => [
      varDeclarationWithAssignment(
        oneToManyAssignment(
          exprs.map((x) => x.assignment.variable),
          exprs[0].assignment.expr,
        ),
      ),
    ],
    blockPredicate,
  );
}

/**
 * Replaces `v1 = e1; v2 = e2; ... ; vn = en` with `(v1,v2,...vn)=(e1,e2,...,en)`
 */
export function addManyToManyAssignments(
  blockPredicate: (block: Block, spine: Spine<Block>) => boolean = () => true,
): Plugin {
  return blockChildrenCollectAndReplace<Assignment<Identifier>>(
    "addManyToManyAssignments",
    (expr, spine, previous) =>
      isAssignmentToIdent()(expr) &&
      !previous.some((x) => spine.someNode(isUserIdent(x.variable.name))),
    (exprs) => [
      manyToManyAssignment(
        exprs.map((x) => x.variable),
        exprs.map((x) => x.expr),
      ),
    ],
    blockPredicate,
  );
}

/**
 * Replaces `var v1 = e1; var v2 = e2; ... ; var vn = en` with `var (v1,v2,...vn)=(e1,e2,...,en)`
 */
export function addVarDeclarationManyToManyAssignments(
  blockPredicate: (block: Block, spine: Spine<Block>) => boolean = () => true,
): Plugin {
  return blockChildrenCollectAndReplace<
    VarDeclarationWithAssignment<Assignment<Identifier>>
  >(
    "addVarDeclarationManyToManyAssignments",
    (expr, spine, previous) =>
      expr.kind === "VarDeclarationWithAssignment" &&
      isAssignmentToIdent()(expr.assignment) &&
      !previous.some((x) =>
        spine.someNode(isUserIdent(x.assignment.variable.name)),
      ),
    (exprs) => [
      varDeclarationWithAssignment(
        manyToManyAssignment(
          exprs.map((x) => x.assignment.variable),
          exprs.map((x) => x.assignment.expr),
        ),
      ),
    ],
    blockPredicate,
  );
}

export function groupVarDeclarations(
  blockPredicate: (block: Block, spine: Spine<Block>) => boolean = () => true,
  transformPredicate: (collected: Node[]) => boolean = (collected: Node[]) =>
    collected.length > 1,
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
    transformPredicate,
  );
}

export function noStandaloneVarDeclarations(node: Node, spine: Spine) {
  if (
    (node.kind === "VarDeclaration" ||
      node.kind === "VarDeclarationWithAssignment") &&
    spine.parent?.node.kind !== "VarDeclarationBlock"
  ) {
    return varDeclarationBlock([node]);
  }
}

export function tempVarToMultipleAssignment(node: Node) {
  if (node.kind === "Block") {
    const newNodes: Node[] = [];
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
        isAssignmentToIdent()(a) &&
        isAssignment(b) &&
        isAssignmentToIdent()(c) &&
        isIdent(c.variable)(b.expr) &&
        isIdent(a.variable)(c.expr)
      ) {
        newNodes.push(
          manyToManyAssignment([b.variable, c.variable], [b.expr, a.expr]),
        );
        changed = true;
        i += 2;
      } else {
        newNodes.push(a);
      }
    }
    if (changed) return block(newNodes);
  }
}

export function inlineVariables(
  node: Node,
  spine: Spine,
  context: CompilationContext,
) {
  context.skipChildren();
  const writes = groupby(getWrites(spine), (x) => x.node.name);
  const suggestions = [];
  for (const a of writes.values()) {
    if (a.length === 1) {
      const variable = a[0].node;
      const write = a[0].parent!;
      if (
        write.node.kind === "Assignment" &&
        write.parent?.node.kind === "Block" &&
        spine.someNode(
          (n) => n !== variable && isUserIdent(variable)(n), // in tests variables are often never read from and we don't want to make those disappear
        ) &&
        !write.getChild($.expr).someNode(isUserIdent(variable)) &&
        !hasSideEffect(write.getChild($.expr))
      ) {
        const assignmentToInlineSpine = write as Spine<Assignment<Identifier>>;
        const assignment = assignmentToInlineSpine.node;
        const assignmentParent = assignmentToInlineSpine.parent?.node;
        suggestions.push(
          spine.withReplacer((x) =>
            x === assignmentParent && x.kind === "Block"
              ? blockOrSingle(x.children.filter((y) => y !== assignment))
              : x.kind === "Identifier" &&
                !x.builtin &&
                x.name === assignment.variable.name
              ? {
                  ...assignment.expr,
                  type: assignment.expr.type ?? assignment.variable.type,
                }
              : undefined,
          ).node,
        );
      }
    }
  }
  return suggestions;
}
