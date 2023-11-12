import {
  assignment,
  id,
  op,
  type IR,
  type Node,
  mutatingInfix,
  type Identifier,
} from "../../IR";
import { EmitError } from "../../common/emit";
import { type Immediate, assertIdentifier } from "./common";

let globalID = 0;
/**
 * This is for converting a tree to a flat list of instructions.
 * It's a tree (not a DAG), so the return value of each sub-expr
 * is only used in one later expression.
 */
class FlatIRChunk {
  private readonly instructions: Node[] = [];
  readonly treeID = ++globalID;

  private ipID(ip: number) {
    return id(`__tmp_ip_${this.treeID}_${ip}`);
  }

  protected pushInstruction(node: Node) {
    this.instructions.push(node);
  }

  protected addAssignment(rhs: Node): IR.Identifier {
    const id = this.ipID(this.instructions.length);
    this.instructions.push(assignment(id, rhs));
    return id;
  }

  getInstructions(): readonly Node[] {
    return this.instructions;
  }

  /**
   * Return an identifier that can be mutated, or nothing.
   * If `right` is false, then assume the returned value has to be freely
   * mutateable, i.e. it is a fresh variable.
   * Otherwise (`right` is true), the returned value can be an Integer node,
   * or a variable that has meaning in outer scope.
   */
  addNode(node: Node, right: true): Immediate | null;
  addNode(node: Node, right: false): Identifier | null;
  addNode(node: Node, right: boolean): Immediate | null {
    switch (node.kind) {
      case "Assignment": {
        assertIdentifier(node.variable, "in LHS of assignment");
        const rhs = this.addNode(node.expr, true);
        if (rhs === null)
          throw new EmitError(node.expr, "RHS assignment is void");
        this.pushInstruction(assignment(node.variable, rhs));
        return node.variable;
      }
      case "Integer":
      case "Identifier":
        // RHS node doesn't need to be a variable reference.
        if (right) return node;
        // We can't just return `node`, since we expect it to be mutable safely.
        return this.addAssignment(node);
      case "Infix": {
        const { left, right } = this.prepBinary(node.left, node.right);
        // Since `left` is only used in this expression,
        // and `left` is a variable, we can mutate it.
        this.pushInstruction(mutatingInfix(node.name, left, right));
        return left;
      }
      case "Op": {
        if (node.args.length === 1) {
          const arg = this.addNode(node.args[0], false);
          if (arg === null)
            throw new EmitError(node.args[0], "Unary Op arg is void");
          const opres = op(node.op, arg);
          // An op like println_int which returns void.
          this.pushInstruction(opres);
          return null;
        } else {
          throw new EmitError(node, "flattening op");
        }
      }
      default:
        throw new EmitError(node, "flattening general");
    }
  }

  prepBinary(leftNode: Node, rightNode: Node) {
    const left = this.addNode(leftNode, false);
    const right = this.addNode(rightNode, true);
    if (left === null) throw new EmitError(leftNode, "LHS op is void");
    if (right === null) throw new EmitError(rightNode, "RHS op is void");
    return { left, right };
  }
}

export function convertNodeToListOfStatements(node: Node) {
  const chunk = new FlatIRChunk();
  chunk.addNode(node, false);
  const insts = chunk.getInstructions();
  return insts;
}
