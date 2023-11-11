import type { Plugin } from "@/common/Language";
import {
  functionDefinition,
  int32Type,
  isSubtype,
  type IR,
  scanningMacroCall,
  textType,
  integerType,
  text,
  id,
  varDeclaration,
  block,
  type VarDeclaration,
  type Node,
  voidType,
  type MutatingInfix,
  assignment,
  op,
  isOfKind,
} from "../../IR";
import { getType } from "../../common/getType";
import { EmitError } from "../../common/emit";
import { type Spine } from "../../common/Spine";

type Immediate = IR.Identifier | IR.Integer;

// true = isAscii
const texStringType = textType(integerType(0, "oo"), true);

// TODO: I don't know what's the actual term. 3 argument code?
export const exprTreeToFlat2AC: Plugin = {
  name: "exprTreeToFlat2AC",
  visit(_node, spine) {
    return spine.flatMapWithChildrenReplacer(exprTreeToFlat2ACVisitor);
  },
};

let globalID = 0;
function exprTreeToFlat2ACVisitor(node: IR.Node, spine: Spine) {
  if (node.kind !== "Assignment") return;
  if (node.variable.kind !== "Identifier") return;
  // if (!isSubtype(getType(node, spine), int32Type)) return;
  const treeID = ++globalID;
  function ipID(ip: number) {
    return id(`__tmp_ip_${treeID}_${ip}`);
  }
  const flat: IR.Assignment[] = [];
  function rec(n: IR.Node): Immediate {
    if (n.kind === "Integer") return n;
    if (n.kind === "Identifier") return n;
    if (n.kind !== "Op") throw new EmitError(n, "tree has a not-Op");
    if (n.args.length !== 2) throw new EmitError(n, "not two args");
    // left
    const left = rec(n.args[0]);
    const newVar = ipID(flat.length);
    const node = assignment(newVar, left);
    flat.push(node);
    // right, and compute.
    const right = rec(n.args[1]);
    const opres = op(n.op, newVar, right);
    flat.push(assignment(newVar, opres));
    return newVar;
  }
  const res = rec(node.expr);
  flat.push(assignment(node.variable, res));
  return flat;
}

/** Bad global state. Insert strings that will need to be counter names. */
const accumulatedCounters = new Set<string>();

export const stuffToMacros: Plugin = {
  name: "stuffToMacros",
  visit(node, spine) {
    switch (node.kind) {
      case "Assignment":
        return assignmentToMacros(node, spine);
      case "MutatingInfix":
        return mutatingInfixToMacros(node, spine);
      case "If":
        return ifToMacros(node, spine);
      case "Op":
        switch (node.op) {
          case "println_int": {
            const arg = node.args[0];
            assertImmediate(arg, "println_int");
            return voidIt(
              // TODO: \\endgraf is long but works everywhere. Try \n\n sometimes
              // TODO: the \\endgraf should be outside the other scanningMacroCall.
              // Works out the same for emit, just feels wrong.
              scanningMacroCall(
                id("\\the", true),
                arg,
                scanningMacroCall(id("\\endgraf", true)),
              ),
            );
          }
        }
    }
  },
};

function assignmentToMacros(
  node: IR.Assignment,
  spine: Spine,
): IR.Node | undefined {
  const { variable, expr } = node;
  const varType = getType(variable, spine);
  const exprType = getType(expr, spine);

  if (isSubtype(varType, int32Type) && isSubtype(exprType, int32Type)) {
    // variable is a counter
    // TODO-tex: ensure variable is \newcount'd.
    assertIdentifier(variable, "in counter assignment LHS");
    assertImmediate(expr, "in counter assignment RHS");
    accumulatedCounters.add(variable.name);
    return voidIt(scanningMacroCall(variable, expr));
  } else if (
    isSubtype(varType, texStringType) &&
    isSubtype(exprType, texStringType)
  ) {
    assertIdentifier(variable, "in string assignment LHS");
    // TODO: the expr cannot be a macro that edits any counters, since that's
    // not allowed inside an edef.
    return functionDefinition(variable, [], expr, {
      isGlobal: true,
      isExpanded: true,
    });
  } else {
    throw new EmitError(node, "not integer and not string");
  }
}

function mutatingInfixToMacros(node: MutatingInfix, spine: Spine) {
  const { variable, right } = node;
  const varType = getType(variable, spine);
  const rightType = getType(right, spine);

  if (isSubtype(varType, int32Type) && isSubtype(rightType, int32Type)) {
    // variable is a counter
    // TODO-tex: ensure variable is \newcount'd.
    assertIdentifier(variable, "in counter assignment LHS");
    assertImmediate(right, "in counter assignment RHS");
    // TODO: negative:
    //   case "-":
    //     if (right.kind === "Integer" && right.value < 0) {
    //       const neg = { ...right, value: -right.value };
    //       return ["\\advance", variable.name, this.emit(neg)];
    //     }
    //     return ["\\advance", variable.name, "-", this.emit(right)];
    accumulatedCounters.add(variable.name);
    const macroName = id(node.name, true);
    return voidIt(scanningMacroCall(macroName, variable, right));
  } else {
    throw new EmitError(node, "not integer");
  }
}

function ifToMacros(node: IR.Node, spine: Spine) {
  if (node.kind !== "If") return;
  const cond = node.condition;
  if (cond.kind !== "Op" || cond.args.length !== 2)
    throw new EmitError(cond, "inside if");
  const [left, right] = cond.args;
  const leftType = getType(left, spine);
  const rightType = getType(right, spine);
  if (isSubtype(leftType, int32Type) && isSubtype(rightType, int32Type)) {
    const op = { gt: ">", lt: "<", eq: "=" }[cond.op as string];
    if (op === undefined) throw new EmitError(cond);
    assertImmediate(left, "inside \\ifnum");
    assertImmediate(right, "inside \\ifnum");
    const n = scanningMacroCall(
      id("\\ifnum", true),
      left,
      text(op),
      right,
      node.consequent,
      ...(node.alternate !== undefined
        ? [id("\\else", true), node.alternate]
        : []),
      id("\\fi", true),
    );
    return voidIt(n);
  } else {
    throw new EmitError(node, "comparing non-integers");
  }
}

export const insertAccumulatedCounters: Plugin = {
  name: "insertAccumulatedCounters",
  visit(node, spine) {
    if (!spine.isRoot) return;
    const decls: VarDeclaration[] = [];
    for (const name of accumulatedCounters) {
      decls.push(varDeclaration(name, int32Type));
    }
    // Clear accumulatedCounters for the next emit pass.
    accumulatedCounters.clear();
    if (decls.length > 0) {
      const children: Node[] = decls;
      children.push(node);
      return block(children);
    }
    return undefined;
  },
};

function voidIt(n: Node) {
  return { ...n, type: voidType };
}

function assertIdentifier(
  n: IR.Node,
  detail: string,
): asserts n is IR.Identifier {
  if (n.kind !== "Identifier") throw new EmitError(n, detail);
}

const isImmediate = isOfKind("Identifier", "Integer");
function assertImmediate(n: IR.Node, detail: string): asserts n is Immediate {
  if (!isImmediate(n)) throw new EmitError(n, detail);
}
