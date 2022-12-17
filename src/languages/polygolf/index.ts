import { toString, Type, variants } from "../../IR";
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

function isEqual(a: Type, b: Type): boolean {
  return toString(a) === toString(b);
}
const initializedVariables = new Set<string>();
const stripTypesIfInferable: Visitor = {
  name: "stripTypesIfInferable",
  enter(path: Path) {
    const program = path.root.node;
    const node = path.node;
    if (path.node.kind === "Program") {
      initializedVariables.clear();
    } else if (
      node.kind === "Identifier" &&
      !node.builtin &&
      path.parent !== null &&
      path.parent.node.kind === "Assignment" &&
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
          node.type = program.variables.get(variable);
        } else {
          node.type = undefined;
        }
        initializedVariables.add(variable);
        return;
      }
    }
    if ("type" in node && node.type !== undefined) {
      if (isEqual(node.type, calcType(node, program))) {
        node.type = undefined;
      }
    }
  },
};

const blocksAsVariants: Visitor = {
  name: "blocksAsVariants",
  exit(path: Path) {
    const node = path.node;
    if (
      node.kind === "Block" &&
      path.parent !== null &&
      path.parent.node.kind !== "Variants" &&
      path.parent.node.kind !== "Program"
    ) {
      path.replaceWith(variants([node]));
    }
  },
};

export default polygolfLanguage;
