import {
  Assignment,
  assignment,
  block,
  Expr,
  // forRange,
  functionCall,
  Identifier,
  int,
  // integerType,
  manyToManyAssignment,
  polygolfOp,
  stringLiteral,
  varDeclaration,
  varDeclarationWithAssignment,
  whileLoop,
} from "../../IR";
import { Path } from "../../common/traverse";
import { getType } from "../../common/getType";

export const stringPrintlnToPrint = {
  enter(path: Path) {
    const node = path.node;
    if (node.type === "PolygolfOp" && node.op === "println") {
      if ( node.args.length === 0) {
        path.replaceWith(polygolfOp("print", stringLiteral("\n")));
      } else if ( getType(node.args[0], path.root.node).type === "text" ) {
        path.replaceWith(polygolfOp("print",
          polygolfOp("text_concat", node.args[0], stringLiteral("\n"))
        ));
      }
    }
  }
}

// TODO: so it turns out that text_concat isn't actually variadic
// so this is massive typecrime
export const simplifyConcats = {
  enter(path: Path) {
    const node = path.node;
    if (node.type === "PolygolfOp" && node.op === "text_concat") {
      let shouldFlatten = false;
      const args = [];
      let accumulatedStringLiteral = "";
      for (const arg of node.args) {
        if (arg.type === "StringLiteral") {
          if (accumulatedStringLiteral.length > 0) {
            shouldFlatten = true;
          }
          accumulatedStringLiteral += arg.value;
          continue;
        } else if (accumulatedStringLiteral.length > 0) {
          args.push(stringLiteral(accumulatedStringLiteral));
          accumulatedStringLiteral = "";
        }
        if (arg.type === "PolygolfOp" && arg.op === "text_concat") {
          shouldFlatten = true;
          args.push(...arg.args);
        } else {
          args.push(arg);
        }
      }
      if (accumulatedStringLiteral.length > 0) {
        args.push(stringLiteral(accumulatedStringLiteral));
        accumulatedStringLiteral = "";
      }
      if (args.length === 0) {
        path.replaceWith(stringLiteral(""));
      } else if (args.length === 1) {
        path.replaceWith(args[0]);
      } else if (shouldFlatten) {
        path.replaceWith(polygolfOp("text_concat", ...args));
      }
    }
  }
}

// fixes the above issue
export const binarizeConcats = {
  enter(path: Path) {
    const node = path.node;
    if (
      node.type === "PolygolfOp" &&
      node.op === "text_concat" &&
      node.args.length > 2
    ) {
      // path.replaceWith(polygolfOp(
      //   "text_concat",
      //   node.args[0],
      //   polygolfOp("text_concat", ...node.args.slice(1))
      // ));
      let thing = node.args[0];
      for (let i = 1; i < node.args.length; i++) {
        thing = polygolfOp("text_concat", thing, node.args[i]);
      }
      path.replaceWith(thing);
    }
  }
}

export const splitPrints = {
  enter(path: Path) {
    const node = path.node;
    if (node.type === "PolygolfOp" && node.op === "print") {
      const arg = node.args[0]
      if (arg.type === "PolygolfOp" && arg.op === "text_concat") {
        const entries = [];
        for (const i of arg.args) {
          entries.push(polygolfOp("print", i));
        }
        path.replaceWith(block(entries));
      } 
      // This actually doesn't help since loop temporary handling
      // currently sucks
      // else if (arg.type === "PolygolfOp" && arg.op === "repeat") {
      //   // TODO: IIRC there was a function that did this
      //   let newVarNum = 0;
      //   while (path.root.node.variables.has(`SUS${newVarNum}`)) {
      //     newVarNum++;
      //   }
      //   path.root.node.variables.set(`SUS${newVarNum}`, integerType(0))
      //   path.replaceWith(forRange(
      //     `SUS${newVarNum}`,
      //     int(0n),
      //     arg.args[1],
      //     int(1n),
      //     polygolfOp("print", arg.args[0])
      //   ));
      // }
    }
  }
}

export const simplifyConstantPrints = {
  enter(path: Path) {
    const node = path.node;
    if (node.type === "PolygolfOp" && node.op === "print") {
      const arg = node.args[0]
      if (arg.type === "StringLiteral") {
        path.replaceWith(
          functionCall([arg, int(BigInt(arg.value.length))],
          "print_length"
        ));
      }
    }
  }
}

export const lowerForRange = {
  enter(path: Path) {
    const node = path.node;
    if (node.type === "ForRange") {
      path.replaceWith(
        block([
          assignment(node.variable, node.low),
          // functionCall([node.variable], "hint_load"),
          whileLoop(polygolfOp("lt", node.variable, node.high), block([
            node.body,
            assignment(node.variable, polygolfOp("add", node.variable, node.increment)),
          ])),
        ])
      );
    }
  }
}

const declared: Set<string> = new Set<string>();
let declarations: Expr[] = [];
export const collectDeclarations = {
  enter(path: Path) {
    const node = path.node;
    if (node.type === "Program") {
      declared.clear();
      declarations = [];
    }
    else if (
      node.type === "Assignment" &&
      node.variable.type === "Identifier" &&
      !declared.has(node.variable.name)
    ) {
      const topLevel = path.parent?.parent?.node.type === "Program";
      declarations.push(simplifyAssignments([node], topLevel));
      // assignment only executed once?
      if (topLevel) {
        path.replaceWith(block([]));
      }
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
  if (topLevel) {
    return varDeclarationWithAssignment(
      assignments.length > 1
        ? manyToManyAssignment(
            assignments.map((x) => x.variable),
            assignments.map((x) => x.expr)
          )
        : assignments[0],
      topLevel
    );
  } else {
    // TODO sus casting
    return varDeclaration(assignments[0].variable as Identifier, assignments[0].expr.valueType!);
  }
}

export const addDeclarations = {
  enter(path: Path) {
    if (
      path.node.type === "Program" &&
      path.node.body.type === "Block"
    ) {
      // console.log(path.node.variables)
      path.replaceChild(block(declarations.concat(path.node.body.children)), "body");
    }
  }
}

export const printStuff = {
  enter(path: Path) {
    console.log("#", path.printPath(), path.node.type);
  }
}