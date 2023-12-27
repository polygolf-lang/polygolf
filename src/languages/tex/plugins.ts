import type { Plugin } from "@/common/Language";
import {
  functionDefinition,
  int32Type,
  isSubtype,
  type IR,
  scanningMacroCall,
  text,
  id,
  varDeclaration,
  block,
  type VarDeclaration,
  type Node,
  voidType,
  type MutatingInfix,
  isOfKind,
  functionCall,
  functionDefinitionNestingDepth,
  type Type,
  type Identifier,
  builtin,
} from "../../IR";
import { getType } from "../../common/getType";
import { EmitError } from "../../common/emit";
import { type Spine } from "../../common/Spine";
import { convertNodeToListOfStatements } from "./FlatIR";
import { assertIdentifier, assertImmediate, texStringType } from "./common";
import { addDefinitions } from "../../plugins/imports";

// TODO: I don't know what's the actual term. 3 argument code?
export const exprTreeToFlat2AC: Plugin = {
  name: "exprTreeToFlat2AC",
  visit(node, spine) {
    if (spine.parent?.node.kind !== "Block") return;
    if (isOfKind("Assignment", "Op", "If")(node))
      return [...convertNodeToListOfStatements(node)];
  },
};

/**
 * Bad global state. Insert strings that will need to be counter names.
 * This should really be replaced with a `compactMap`, but I didn't have an
 * easy way to detect what variables are counters. Seems should be easy though.
 */
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
          case "println[Int]": {
            const arg = node.args[0]!;
            assertImmediate(arg, "println[Int]");
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
    const { name } = node;
    if (name === "helper_sub") {
      // TODO: handle negative `right`.
      return voidIt(
        scanningMacroCall(builtin("\\advance"), variable, text("-"), right),
      );
    }
    // \advance, \multiply, \divide gobble up numbers on second argument,
    // so they don't need curly braces.
    const isScan =
      name === "\\advance" || name === "\\multiply" || name === "\\divide";
    const macroName = id(name, isScan);
    if (isScan) {
      return voidIt(scanningMacroCall(macroName, variable, right));
    } else {
      return voidIt(functionCall(macroName, variable, right));
    }
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

function idWithType(name: string, type: Type): Identifier {
  return { ...id(name), type };
}

const modX = idWithType("helper_mod_x", int32Type);
const modY = idWithType("helper_mod_y", int32Type);
const modTmp = idWithType("helper_mod_tmp", int32Type);
const modImpl = functionDefinition(
  "helper_mod",
  [modX, modY],
  block([
    scanningMacroCall(modTmp, modX),
    scanningMacroCall(builtin("\\divide"), modTmp, modY),
    scanningMacroCall(builtin("\\multiply"), modTmp, modY),
    scanningMacroCall(builtin("\\advance"), modX, text("-"), modTmp),
  ]),
);
export const addTeXHelpers: Plugin = addDefinitions({
  /**
   * helper_mod is a macro that behaves like \divide except returning the modulo,
   * and the second argument must be a proper argument (can't scan for number).
   */
  helper_mod: () => {
    accumulatedCounters.add(modTmp.name);
    return modImpl;
  },
});

export const macroParamsToHash: Plugin = {
  name: "macroParamsToHash",
  visit(node, spine) {
    if (node.kind !== "FunctionDefinition" || node.args.length === 0) return;
    const depth = functionDefinitionNestingDepth(spine) - 1;
    const hash = "#".repeat(2 ** depth);
    const identMap = new Map(
      node.args.map((ident, i) => [ident.name, id(`${hash}${i + 1}`)]),
    );
    return spine.withReplacer((n) => {
      if (n.kind !== "Identifier") return;
      const g = identMap.get(n.name);
      if (g === undefined) return;
      return g;
    }).node;
  },
};

function voidIt(n: Node) {
  return { ...n, type: voidType };
}
