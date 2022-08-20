import { IR } from ".";
import { Path, programToPath } from ".";
import { Block, Variants } from "./IR";

export function expandVariants(program: IR.Program): IR.Program[]{
  return getVariantChoices(getVariantsStructure(program)).map(x => instantiateProgram(program, x))
}

function getVariantChoices(program: Variant): number[][]{
  var result: number[][] = [[]];
  program.commands.forEach(cmd => {
    var cmdChoices = getCommandChoices(cmd);
    var newResult: number[][] = [];
    result.forEach(prefix => {
      cmdChoices.forEach(suffix => {
        newResult.push(prefix.concat(suffix));
      })
    })
    result = newResult;
  });
  return result
}

function getCommandChoices(command: Command): number[][]{
  var result: number[][] = [];
  command.variants.forEach((vari, i) => {
    getVariantChoices(vari).forEach(varChoices => {
      result.push([i].concat(varChoices));
    })
  });
  return result;
}

type Variant = {commands: Command[]}
type Command = {variants: Variant[]}

function getVariantsStructure(node: IR.Program): Variant{
  var result: Variant = {commands: []};
  function visit(path: Path, parent: Variant = result): void {
    if(path.node.type === "Variants"){
      var c: Command = {variants: []};
      parent.commands.push(c);
      path.getChildPaths().forEach(x => {
        var v: Variant = {commands: []}
        c.variants.push(v);
        x.getChildPaths().forEach(y => {
          visit(y, v);
        })
      });
    }
    else{
      path.getChildPaths().forEach(x => visit(x, parent));
    }
  }
  visit(programToPath(node));
  return result;
}

function instantiateProgram(node: IR.Program, choices: number[]): IR.Program{
  var node: IR.Program = structuredClone(node);
  choices.reverse();
  programToPath(node).visit(x => {
    if(x.node.type === "Block"){
      while(x.node.children.some(y => y.type === "Variants")){
        var origChildren = x.node.children;
        x.node.children = [];
        origChildren.forEach(c => {
          if(x.node.type === "Block"){
            if(c.type === "Variants"){
              c.variants[choices.pop()!].children.forEach(v => {
                if(x.node.type == "Block") x.node.children.push(v);
              });
            }
            else{
              x.node.children.push(c);
            }
          }
        });
      }
    }
  });
  return node;
}