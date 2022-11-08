import { toString, ValueType, variants } from "../../IR";
import { defaultDetokenizer, Language } from "../../common/Language";

import emitProgram from "./emit";
import { Path, Visitor } from "../../common/traverse";
import { calcType, getType } from "../../common/getType";

function polygolfLanguage(stripTypes = false): Language {
  const plugins: Visitor[] = [];
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
  enter(path: Path) {
    const program = path.root.node;
    const node = path.node;
    if (path.node.type === "Program") {
      initializedVariables.clear();
    } else if (
      node.type === "Identifier" &&
      !node.builtin &&
      path.parent !== null &&
      path.parent.node.type === "Assignment" &&
      path.pathFragment === "variable"
    ) {
      const variable = node.name;
      if (
        program.variables.has(variable) &&
        !initializedVariables.has(variable)
      ) {
        if (
          !isEqual(
            getType(path.parent.node.expr, program),
            program.variables.get(variable)!
          )
        ) {
          node.valueType = program.variables.get(variable);
        } else {
          node.valueType = undefined;
        }
        initializedVariables.add(variable);
        return;
      }
    }
    if ("valueType" in node && node.valueType !== undefined) {
      if (isEqual(node.valueType, calcType(node, program))) {
        node.valueType = undefined;
      }
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
