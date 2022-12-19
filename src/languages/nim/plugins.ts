import {
  Assignment,
  block,
  Expr,
  ImportStatement,
  importStatement,
  manyToManyAssignment,
  methodCall,
  Program,
  varDeclarationWithAssignment,
} from "../../IR";
import { Path, Visitor } from "../../common/traverse";
import { getType } from "../../common/getType";

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

export const addImports: Visitor = {
  name: "addImports",
  enterProgram(program: Program) {
    const dependencies = [...program.dependencies];
    if (dependencies.length < 1) return;
    let imports: ImportStatement;
    for (const include of includes) {
      if (include[0].length > dependencies.join().length - 1) break;
      if (dependencies.every((x) => include[1].includes(x))) {
        imports = importStatement("include", [include[0]]);
        break;
      }
    }
    imports ??= importStatement("import", dependencies);
    program.body =
      program.body.kind === "Block"
        ? block([imports, ...program.body.children])
        : block([imports, program.body]);
  },
};

const declared: Set<string> = new Set<string>();
export const addVarDeclarations: Visitor = {
  name: "addVarDeclarations",
  enter(path: Path) {
    const node = path.node;
    if (node.kind === "Program") declared.clear();
    else if (
      path.parent?.node.kind !== "Block" &&
      node.kind === "Assignment" &&
      node.variable.kind === "Identifier" &&
      !declared.has(node.variable.name)
    ) {
      path.replaceWith(simplifyAssignments([node], false));
    } else if (node.kind === "Block") {
      let assignments: Assignment[] = [];
      const newNodes: Expr[] = [];
      function processAssignments() {
        if (assignments.length > 0) {
          newNodes.push(
            simplifyAssignments(
              assignments,
              path.parent?.node.kind === "Program" && assignments.length > 1
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
      node.children = newNodes;
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

export const useUnsignedDivision: Visitor = {
  name: "useUnsignedDivision",
  exit(path: Path) {
    const node = path.node;
    const program = path.root.node;
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
        node.name = node.op === "trunc_div" ? "/%" : "%%";
      }
    }
  },
};

export const useUFCS: Visitor = {
  name: "useUFCS",
  exit(path: Path) {
    const node = path.node;
    if (node.kind === "FunctionCall" && node.args.length > 0) {
      if (node.args.length === 1 && node.args[0].kind === "StringLiteral") {
        return;
      }
      const [obj, ...args] = node.args;
      if (obj.kind !== "BinaryOp" && obj.kind !== "UnaryOp") {
        path.replaceWith(
          methodCall(obj, args, node.ident, node.op ?? undefined)
        );
      }
    }
  },
};
