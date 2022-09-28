import {
  Assignment,
  block,
  functionCall,
  id,
  importStatement,
  manyToManyAssignment,
  methodCall,
  Program,
  Statement,
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
      for (const include of includes) {
        if (dependecies.every((x) => include[1].includes(x))) {
          program.block.children = [
            importStatement("include", [include[0]]),
            ...program.block.children,
          ];
          return;
        }
      }
      program.block.children = [
        importStatement("import", dependecies),
        ...program.block.children,
      ];
    }
  },
};

const declared: Set<string> = new Set<string>();
export const addVarDeclarations = {
  enter(path: Path) {
    const node = path.node;
    if (node.type === "Program") declared.clear();
    if (node.type === "Block") {
      let assignments: Assignment[] = [];
      let newNodes: Statement[] = [];
      function processAssignments() {
        if (assignments.length > 0) {
          newNodes = newNodes.concat(
            simplifyAssignments(
              assignments,
              path.parent?.node.type === "Program" && assignments.length > 1
            )
          );
          assignments = [];
        }
      }
      for (const child of node.children) {
        if (child.type !== "Assignment" || declared.has(child.variable.name)) {
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
): Statement[] {
  for (const v of assignments) {
    declared.add(v.variable.name);
  }
  return [
    varDeclarationWithAssignment(
      assignments.length > 1
        ? manyToManyAssignment(
            assignments.map((x) => x.variable),
            assignments.map((x) => x.expr)
          )
        : assignments[0],
      topLevel
    ),
  ];
}

export const useUnsignedDivision = {
  exit(path: Path) {
    const node = path.node;
    const program = path.root.node;
    if (
      node.type === "BinaryOp" &&
      (node.op === "truncdiv" || node.op === "rem")
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
        node.name = node.op === "truncdiv" ? "/%" : "%%";
      }
    }
  },
};

export const printToFunctionCall = {
  enter(path: Path) {
    const node = path.node;
    if (node.type === "Print") {
      if (node.newline)
        path.replaceWith(functionCall(null, [node.value], "echo"));
      else
        path.replaceWith(
          functionCall(null, [id("stdout", true), node.value], "write")
        );
    }
  },
};

export const useUFCS = {
  exit(path: Path) {
    const node = path.node;
    if (node.type === "FunctionCall" && node.args.length > 0) {
      const [obj, ...args] = node.args;
      if (obj.type !== "BinaryOp" && obj.type !== "UnaryOp") {
        path.replaceWith(methodCall(node.op, obj, args, node.ident));
      }
    }
  },
};
