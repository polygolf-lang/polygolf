import { IR } from "../IR";
import { Path, programToPath } from "./traverse";

/**
 * Expand all of the variant nodes in program to get a list of fully-
 * instantiated Programs (without any Variant nodes in them)
 */
export function expandVariants(program: IR.Program): IR.Program[] {
  const structure: Variant = getVariantsStructure(program);
  const expansionCount = countVariantExpansions(structure);
  if (expansionCount > 1000) {
    throw new Error(`Too many variants (${expansionCount}).`);
  }
  return getVariantChoices(structure).map((x) =>
    instantiateProgram(program, x)
  );
}

function getVariantChoices(program: Variant): number[][] {
  let result: number[][] = [[]];
  program.commands.forEach((cmd) => {
    const cmdChoices = getCommandChoices(cmd);
    const newResult: number[][] = [];
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
  const result: number[][] = [];
  command.variants.forEach((vari, i) => {
    getVariantChoices(vari).forEach((varChoices) => {
      result.push([i].concat(varChoices));
    });
  });
  return result;
}

/**
 * This Variant/Command structure represents the skeleton of variants in a
 * program, with all details removed
 */
interface Variant {
  commands: Command[];
}
interface Command {
  variants: Variant[];
}

/**
 * Convert a program to its corresponding Variant structure: the tree of
 * Variants and Commands with no details about what statements are precisely ran
 */
function getVariantsStructure(node: IR.Program): Variant {
  const result: Variant = { commands: [] };
  function visit(path: Path, parent: Variant = result): void {
    if (path.node.kind === "Variants") {
      const c: Command = { variants: [] };
      parent.commands.push(c);
      path.getChildPaths().forEach((x) => {
        const v: Variant = { commands: [] };
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
  programToPath(program).visit({
    name: "anonymous",
    enter(path) {
      const node = path.node;
      if (node.kind === "Variants") {
        path.replaceWith(node.variants[choices.pop()!]);
      }
    },
  });
  return program;
}
