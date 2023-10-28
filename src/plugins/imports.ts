import { Spine } from "../common/Spine";
import { Plugin } from "../common/Language";
import { block, Node, importStatement, isBuiltinIdent, isOfKind } from "../IR";

/**
 * @param rules Map from expr to a import it needs or array encoded map from symbol name to import.
 * @param output Mapping of collected import names to the Import Node to be added or a name to be used for ImportStatement.
 * @returns The import adding plugin.
 */
export function addImports( // TODO caching
  rules: [string, string][] | ((n: Node, s: Spine) => string | undefined),
  output: string | ((modules: string[]) => Node | undefined)
): Plugin {
  let rulesFunc: (n: Node, s: Spine) => string | undefined;
  if (Array.isArray(rules)) {
    const map = new Map(rules);
    rulesFunc = function (x: Node) {
      if (map.has(x.kind)) return map.get(x.kind)!;
      if (
        (isBuiltinIdent()(x) || isOfKind("BinaryOp", "UnaryOp")(x)) &&
        map.has(x.name)
      ) {
        return map.get(x.name)!;
      }
    };
  } else rulesFunc = rules;

  const outputFunc =
    typeof output === "string"
      ? (x: string[]) => (x.length > 0 ? importStatement(output, x) : undefined)
      : output;

  return {
    name: "addImports(...)",
    visit(node, spine) {
      if (!spine.isRoot) return;
      const modules = spine.compactMap(rulesFunc);
      const outputNode = outputFunc([...new Set(modules)]);
      if (outputNode !== undefined) {
        return block([outputNode, node]);
      }
    },
  };
}
