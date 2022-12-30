import {
  Assignment,
  block,
  Expr,
  ImportStatement,
  importStatement,
  manyToManyAssignment,
  methodCall,
  varDeclarationWithAssignment,
} from "../../IR";
import { getType } from "../../common/getType";
import { Plugin } from "../../common/Language";

const includes: [string, string[]][] = [
  ["re", ["strutils"]],
  ["net", ["os", "strutils"]],
  ["math", ["since", "bitops", "fenv"]],
  ["tables", ["since", "hashes", "math", "algorithm"]],
  [
    "prelude",
    [
      "os",
      "strutils",
      "times",
      "parseutils",
      "hashes",
      "tables",
      "sets",
      "sequtils",
      "parseopt",
      "strformat",
    ],
  ],
];

export function addImports(dependencyMap0: [string, string][]): Plugin {
  const dependencyMap = new Map(dependencyMap0);
  return {
    name: "addImports",
    visit(program, spine) {
      if (program.kind !== "Program") return;
      // get dependencies
      // TODO: abstract this part for other languages
      // TODO: cache, and maybe do recursive merging for performance
      const dependenciesGen = spine.compactMap((node) => {
        let op: string = node.kind;
        if (node.kind === "BinaryOp" || node.kind === "UnaryOp") op = node.name;
        if (node.kind === "FunctionCall") op = node.ident.name;
        if (node.kind === "MethodCall") op = node.ident.name;
        if (dependencyMap.has(op)) {
          return dependencyMap.get(op)!;
        }
      });
      const dependencies = [...new Set(dependenciesGen)];
      if (dependencies.length < 1) return;
      // now actually apply dependencies
      let imports: ImportStatement;
      for (const include of includes) {
        if (include[0].length > dependencies.join().length - 1) break;
        if (dependencies.every((x) => include[1].includes(x))) {
          imports = importStatement("include", [include[0]]);
          break;
        }
      }
      imports ??= importStatement("import", dependencies);
      return {
        ...program,
        body:
          program.body.kind === "Block"
            ? block([imports, ...program.body.children])
            : block([imports, program.body]),
      };
    },
  };
}

const declared: Set<string> = new Set<string>();
export const addVarDeclarations: Plugin = {
  name: "addVarDeclarations",
  visit(node, spine) {
    if (node.kind === "Program") declared.clear();
    else if (
      spine.parent?.node.kind !== "Block" &&
      node.kind === "Assignment" &&
      node.variable.kind === "Identifier" &&
      !declared.has(node.variable.name)
    ) {
      return simplifyAssignments([node], false);
    } else if (node.kind === "Block") {
      let assignments: Assignment[] = [];
      const newNodes: Expr[] = [];
      function processAssignments() {
        if (assignments.length > 0) {
          newNodes.push(
            simplifyAssignments(
              assignments,
              spine.parent?.node.kind === "Program" && assignments.length > 1
            )
          );
          assignments = [];
        }
      }
      for (const child of node.children) {
        if (
          child.kind !== "Assignment" ||
          child.variable.kind !== "Identifier" ||
          declared.has(child.variable.name)
        ) {
          processAssignments();
          newNodes.push(child);
        } else {
          assignments.push(child);
        }
      }
      processAssignments();
      return {
        ...node,
        children: newNodes,
      };
    }
  },
};

function simplifyAssignments(
  assignments: Assignment[],
  topLevel: boolean
): Expr {
  for (const v of assignments) {
    if (v.variable.kind === "Identifier") {
      declared.add(v.variable.name);
    }
  }
  return varDeclarationWithAssignment(
    assignments.length > 1
      ? manyToManyAssignment(
          assignments.map((x) => x.variable),
          assignments.map((x) => x.expr)
        )
      : assignments[0],
    topLevel
  );
}

export const useUnsignedDivision: Plugin = {
  name: "useUnsignedDivision",
  visit(node, spine) {
    const program = spine.root.node;
    if (
      node.kind === "BinaryOp" &&
      (node.op === "trunc_div" || node.op === "rem")
    ) {
      const right = getType(node.right, program);
      const left = getType(node.left, program);
      if (right.kind !== "integer" || left.kind !== "integer")
        throw new Error(`Unexpected type ${JSON.stringify([left, right])}.`);
      if (
        left.low !== undefined &&
        left.low >= 0n &&
        right.low !== undefined &&
        right.low >= 0n
      ) {
        const name = node.op === "trunc_div" ? "/%" : "%%";
        if (name !== node.name)
          return {
            ...node,
            name,
          };
      }
    }
  },
};

export const useUFCS: Plugin = {
  name: "useUFCS",
  visit(node) {
    if (node.kind === "FunctionCall" && node.args.length > 0) {
      if (node.args.length === 1 && node.args[0].kind === "StringLiteral") {
        return;
      }
      const [obj, ...args] = node.args;
      if (obj.kind !== "BinaryOp" && obj.kind !== "UnaryOp") {
        return methodCall(obj, args, node.ident, node.op ?? undefined);
      }
    }
  },
};
