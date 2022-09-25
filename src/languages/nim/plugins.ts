import {
  Assignment,
  block,
  importStatement,
  manyToManyAssignment,
  Program,
  Statement,
  varDeclarationWithAssignment,
} from "../../IR";
import { Path } from "../../common/traverse";

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
