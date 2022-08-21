import { IR } from ".";
import { Path, programToPath } from ".";

export function expandVariants(program: IR.Program): IR.Program[] {
  var structure: Variant = getVariantsStructure(program);
  var expansionCount = countVariantExpansions(structure);
  if (expansionCount > 1000) {
    throw new Error(`Too many variants (${expansionCount}).`);
  }
  return getVariantChoices(structure).map((x) =>
    instantiateProgram(program, x)
  );
}

function getVariantChoices(program: Variant): number[][] {
  var result: number[][] = [[]];
  program.commands.forEach((cmd) => {
    var cmdChoices = getCommandChoices(cmd);
    var newResult: number[][] = [];
    result.forEach((prefix) => {
      cmdChoices.forEach((suffix) => {
        newResult.push(prefix.concat(suffix));
      });
    });
    result = newResult;
  });
  return result;
}

function countVariantExpansions(structure: Variant): number {
  return structure.commands
    .map(countCommandExpansion)
    .reduce((a, b) => a * b, 1);
}

function countCommandExpansion(structure: Command): number {
  return structure.variants
    .map(countVariantExpansions)
    .reduce((a, b) => a + b, 0);
}

function getCommandChoices(command: Command): number[][] {
  var result: number[][] = [];
  command.variants.forEach((vari, i) => {
    getVariantChoices(vari).forEach((varChoices) => {
      result.push([i].concat(varChoices));
    });
  });
  return result;
}

type Variant = { commands: Command[] };
type Command = { variants: Variant[] };

function getVariantsStructure(node: IR.Program): Variant {
  var result: Variant = { commands: [] };
  function visit(path: Path, parent: Variant = result): void {
    if (path.node.type === "Variants") {
      var c: Command = { variants: [] };
      parent.commands.push(c);
      path.getChildPaths().forEach((x) => {
        var v: Variant = { commands: [] };
        c.variants.push(v);
        x.getChildPaths().forEach((y) => {
          visit(y, v);
        });
      });
    } else {
      path.getChildPaths().forEach((x) => visit(x, parent));
    }
  }
  visit(programToPath(node));
  return result;
}

function instantiateProgram(
  program: IR.Program,
  choices: number[]
): IR.Program {
  program = structuredClone(program);
  choices.reverse();
  programToPath(program).visit((path) => {
    const node = path.node;
    if (node.type === "Block") {
      while (node.children.some((child) => child.type === "Variants")) {
        node.children = node.children.flatMap((c) =>
          c.type === "Variants" ? c.variants[choices.pop()!].children : c
        );
      }
    }
  });
  return program;
}
