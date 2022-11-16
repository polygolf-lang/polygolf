import {
  getArgs,
  int,
  isOpCode,
  polygolfOp,
  StringLiteral,
  stringLiteral,
  variants,
  voidType,
} from "../IR";
import { getType } from "../common/getType";
import { Path, Visitor } from "../common/traverse";

const golfedStringListLiterals = new WeakMap();
export const golfStringListLiteral: Visitor = {
  generatesVariants: true,
  exit(path: Path) {
    const node = path.node;
    if (
      node.type === "ListConstructor" &&
      node.exprs.every((x) => x.type === "StringLiteral") &&
      !golfedStringListLiterals.has(node)
    ) {
      golfedStringListLiterals.set(node, true);
      const strings = (node.exprs as StringLiteral[]).map((x) => x.value);
      const delim = getDelim(strings);
      path.replaceWith(
        variants([
          node,
          delim === " "
            ? polygolfOp(
                "text_split_whitespace",
                stringLiteral(strings.join(delim))
              )
            : polygolfOp(
                "text_split",
                stringLiteral(strings.join(delim)),
                stringLiteral(delim)
              ),
        ])
      );
    }
  },
};

function getDelim(strings: string[]): string {
  const string = strings.join();
  if (!/\s/.test(string)) return " ";
  for (let i = 33; i < 127; i++) {
    const c = String.fromCharCode(i);
    if (!string.includes(c)) {
      return c;
    }
  }
  let i = 0;
  while (string.includes(String(i))) {
    i++;
  }
  return String(i);
}

export const evalStaticExpr: Visitor = {
  enter(path: Path) {
    const node = path.node;
    if (
      "op" in node &&
      node.op !== null &&
      isOpCode(node.op) &&
      node.type !== "MutatingBinaryOp"
    ) {
      const args = getArgs(node);
      let type = voidType;
      try {
        // encoutering nodes that we don't know the type of is fine
        type = getType(node, path.root.node);
      } catch {}
      if (
        // if the inferred type of the node is a constant integer, replace it with a literal node
        type.type === "integer" &&
        type.low === type.high &&
        type.low !== undefined
      ) {
        path.replaceWith(int(type.low));
      } else if (args.every((x) => x.type === "StringLiteral")) {
        const argsVals = args.map((x) => (x as StringLiteral).value);
        if (node.op === "text_concat")
          path.replaceWith(stringLiteral(argsVals[0].concat(argsVals[1])));
      }
    }
  },
};
