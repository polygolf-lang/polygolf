import type { PluginVisitor, Spine } from "../common/Spine";
import { block, type Node, importStatement, isIdent } from "../IR";

/**
 * @param rules Map from expr to a import it needs or array encoded map from symbol name to import.
 * @param output Mapping of collected import names to the Import Node to be added or a name to be used for Import.
 * @returns The import adding plugin.
 */
export function addImports( // TODO caching
  rules: Record<string, string[]> | ((n: Node, s: Spine) => string | undefined),
  output: string | ((modules: string[]) => Node | undefined) = "import",
): PluginVisitor {
  let rulesFunc: (n: Node, s: Spine) => string | undefined;
  if (typeof rules === "object") {
    rulesFunc = (x) =>
      Object.entries(rules).find(
        ([_, names]) =>
          names.includes(x.kind) ||
          (!isIdent()(x) && names.includes((x as any).name)),
      )?.[0];
  } else rulesFunc = rules;

  const outputFunc =
    typeof output === "string"
      ? (x: string[]) => (x.length > 0 ? importStatement(output, x) : undefined)
      : output;

  return function addImports(node, spine, context) {
    context.skipChildren();
    const modules = spine.compactMap(rulesFunc);
    const outputNode = outputFunc([...new Set(modules)]);
    if (outputNode !== undefined) {
      return block([outputNode, node]);
    }
  };
}
