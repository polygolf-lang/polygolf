import {
  assignment,
  block,
  polygolfOp,
  StringLiteral,
  stringLiteral,
  variants,
} from "../IR";
import { Path, Visitor } from "../common/traverse";

const golfedNodes = new WeakMap();
export const golfStringListLiteral: Visitor = {
  generatesVariants: true,
  exit(path: Path) {
    const node = path.node;
    if (
      !golfedNodes.has(node) &&
      node.type === "Assignment" &&
      node.expr.type === "ListConstructor" &&
      node.expr.exprs.every((x) => x.type === "StringLiteral")
    ) {
      golfedNodes.set(node, true);
      const strings = (node.expr.exprs as StringLiteral[]).map((x) => x.value);
      const delim = getUnusedChar(strings);
      path.replaceWith(
        variants([
          block([
            assignment(
              structuredClone(node.variable),
              polygolfOp(
                "str_split",
                stringLiteral(strings.join(delim)),
                stringLiteral(delim)
              )
            ),
          ]),
          block([node]),
        ])
      );
    }
  },
};

function getUnusedChar(strings: string[]): string {
  for (let i = 32; i < 127; i++) {
    const c = String.fromCharCode(i);
    if (strings.every((x) => !x.includes(c))) {
      return c;
    }
  }
  return "DELIM";
}
