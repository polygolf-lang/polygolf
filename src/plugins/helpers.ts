import type { Plugin } from "../common/Language";
import type { PluginVisitor } from "../common/Spine";

export function applyIf<T extends Plugin | PluginVisitor>(
  plugin: T,
  predicate: PluginVisitor<boolean>,
): Plugin {
  return {
    name: `filtered ${plugin.name}`,
    visit(node, spine, context) {
      if (predicate(node, spine, context)) {
        return ((typeof plugin === "function" ? plugin : plugin.visit) as any)(
          node,
          spine,
          context,
        );
      }
    },
  };
}
