import { type Spine } from "../common/Spine";
import { type Plugin } from "../common/Language";
import { block, type Node, importStatement, isUserIdent } from "../IR";

/**
 * @param rules Map from expr to a import it needs or array encoded map from symbol name to import.
 * @param output Mapping of collected import names to the Import Node to be added or a name to be used for Import.
 * @returns The import adding plugin.
 */
export function addImports( // TODO caching
  rules: Record<string, string> | ((n: Node, s: Spine) => string | undefined),
  output: string | ((modules: string[]) => Node | undefined) = "import",
): Plugin {
  let rulesFunc: (n: Node, s: Spine) => string | undefined;
  if (typeof rules === "object") {
    rulesFunc = (x) =>
      rules[x.kind] ?? (isUserIdent()(x) ? undefined : rules[(x as any).name]);
  } else rulesFunc = rules;

  const outputFunc =
    typeof output === "string"
      ? (x: string[]) => (x.length > 0 ? importStatement(output, x) : undefined)
      : output;

  return {
    name: "addImports(...)",
    visit(node, spine, context) {
      context.skipChildren();
      const modules = spine.compactMap(rulesFunc);
      const outputNode = outputFunc([...new Set(modules)]);
      if (outputNode !== undefined) {
        return block([outputNode, node]);
      }
    },
  };
}
