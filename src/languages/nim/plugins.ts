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
import { Path } from "../../common/traverse";
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

export const addImports = {
  exit(path: Path) {
    if (path.node.type === "Program") {
      const program: Program = path.node;
      const dependecies = [...program.dependencies];
      if (dependecies.length < 1) return;
      let imports: ImportStatement;
      for (const include of includes) {
        if (include[0].length > dependecies.join().length - 1) break;
        if (dependecies.every((x) => include[1].includes(x))) {
          imports = importStatement("include", [include[0]]);
          break;
        }
      }
      imports ??= importStatement("import", dependecies);
      program.body =
        program.body.type === "Block"
          ? block([imports, ...program.body.children])
          : block([imports, program.body]);
    }
  },
};

const declared: Set<string> = new Set<string>();
export const addVarDeclarations = {
  enter(path: Path) {
    const node = path.node;
    if (node.type === "Program") declared.clear();
    else if (
      path.parent?.node.type !== "Block" &&
      node.type === "Assignment" &&
      node.variable.type === "Identifier" &&
      !declared.has(node.variable.name)
    ) {
      path.replaceWith(simplifyAssignments([node], false));
    } else if (node.type === "Block") {
      let assignments: Assignment[] = [];
      const newNodes: Expr[] = [];
      function processAssignments() {
        if (assignments.length > 0) {
          newNodes.push(
            simplifyAssignments(
              assignments,
              path.parent?.node.type === "Program" && assignments.length > 1
            )
          );
          assignments = [];
        }
      }
      for (const child of node.children) {
        if (
          child.type !== "Assignment" ||
          child.variable.type !== "Identifier" ||
          declared.has(child.variable.name)
        ) {
          processAssignments();
          newNodes.push(child);
        } else {
          assignments.push(child);
        }
      }
      processAssignments();
      path.replaceWith(block(newNodes));
    }
  },
};

function simplifyAssignments(
  assignments: Assignment[],
  topLevel: boolean
): Expr {
  for (const v of assignments) {
    if (v.variable.type === "Identifier") {
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

export const useUnsignedDivision = {
  exit(path: Path) {
    const node = path.node;
    const program = path.root.node;
    if (
      node.type === "BinaryOp" &&
      (node.op === "trunc_div" || node.op === "rem")
    ) {
      const right = getType(node.right, program);
      const left = getType(node.left, program);
      if (right.type !== "integer" || left.type !== "integer")
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

export const useUFCS = {
  exit(path: Path) {
    const node = path.node;
    if (node.type === "FunctionCall" && node.args.length > 0) {
      if (node.args.length === 1 && node.args[0].type === "StringLiteral") {
        return;
      }
      const [obj, ...args] = node.args;
      if (obj.type !== "BinaryOp" && obj.type !== "UnaryOp") {
        path.replaceWith(
          methodCall(obj, args, node.ident, node.op ?? undefined)
        );
      }
    }
  },
};
