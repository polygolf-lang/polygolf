import { Spine } from "../common/Spine";
import { Plugin } from "../common/Language";
import { block, Expr, importStatement, program } from "../IR";

/**
 * @param rules Map from expr to a import it needs or array encoded map from symbol name to import.
 * @param output Mapping of collected import names to the Import Expr to be added or a name to be used for ImportStatement.
 * @returns The import adding plugin.
 */
export function addImports( // TODO caching
  rules: [string, string][] | ((n: Expr, s: Spine) => string | undefined),
  output: string | ((modules: string[]) => Expr | undefined)
): Plugin {
  let rulesFunc: (n: Expr, s: Spine) => string | undefined;
  if (Array.isArray(rules)) {
    const map = new Map(rules);
    rulesFunc = function (x: Expr) {
      if (map.has(x.kind)) return map.get(x.kind)!;
      if (
        ((x.kind === "Identifier" && x.builtin) ||
          x.kind === "BinaryOp" ||
          x.kind === "UnaryOp") &&
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
      if (node.kind !== "Program") return;
      const modules = spine.compactMap((n, s) =>
        n.kind === "Program" ? undefined : rulesFunc(n, s)
      );
      const outputExpr = outputFunc([...new Set(modules)]);
      if (outputExpr !== undefined) {
        return program(block([outputExpr, node.body]));
      }
    },
  };
}
