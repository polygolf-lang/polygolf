import { toString, ValueType, variants } from "../../IR";
import { defaultDetokenizer, Language } from "../../common/Language";

import emitProgram from "./emit";
import { Path, Visitor } from "../../common/traverse";
import { calcType, getType } from "../../common/getType";

function polygolfLanguage(stripTypes = false, forceBlocks = true): Language {
  const plugins: Visitor[] = [];
  if (forceBlocks) plugins.push(forceControlFlowBlocks);
  plugins.push(blocksAsVariants);
  if (stripTypes) plugins.push(stripTypesIfInferable);
  return {
    name: "Polygolf",
    emitter: emitProgram,
    plugins,
    detokenizer: defaultDetokenizer(
      (a, b) =>
        a !== "(" &&
        b !== ")" &&
        b !== ";" &&
        b !== ":" &&
        a !== ":" &&
        a !== "\n" &&
        b !== "\n",
      2
    ),
  };
}

function isEqual(a: ValueType, b: ValueType): boolean {
  return toString(a) === toString(b);
}
const initializedVariables = new Set<string>();
const stripTypesIfInferable: Visitor = {
  exit(path: Path) {
    const program = path.root.node;
    const node = path.node;
    if (node.type === "Program") {
      initializedVariables.clear();
    } else if (
      node.type === "Assignment" &&
      node.variable.type === "Identifier" &&
      !node.variable.builtin
    ) {
      const variable = node.variable.name;
      if (
        program.variables.has(variable) &&
        !initializedVariables.has(variable)
      ) {
        if (
          !isEqual(
            getType(node.expr, program),
            program.variables.get(variable)!
          )
        ) {
          node.variable.valueType = program.variables.get(variable);
        }
        initializedVariables.add(variable);
      }
    } else if ("valueType" in node && node.valueType !== undefined) {
      if (isEqual(node.valueType, calcType(node, program))) {
        path.replaceWith({ ...node, valueType: undefined });
      }
    }
  },
};

const forceControlFlowBlocks: Visitor = {
  enter(path: Path) {
    if (path.parent !== null) {
      const node = path.node;
      if ("consequent" in node && node.consequent.type !== "Block")
        path.replaceChild(variants([node.consequent]), "consequent");
      if (
        "alternate" in node &&
        node.alternate !== undefined &&
        node.alternate.type !== "Block"
      )
        path.replaceChild(variants([node.alternate]), "alternate");
      if ("body" in node && node.body.type !== "Block")
        path.replaceChild(variants([node.body]), "body");
    }
  },
};

const blocksAsVariants: Visitor = {
  exit(path: Path) {
    const node = path.node;
    if (
      node.type === "Block" &&
      path.parent !== null &&
      path.parent.node.type !== "Variants" &&
      path.parent.node.type !== "Program"
    ) {
      path.replaceWith(variants([node]));
    }
  },
};

export default polygolfLanguage;
