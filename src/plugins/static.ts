import { polygolfOp, TextLiteral, text, isTextLiteral } from "../IR";
import { Plugin } from "../common/Language";

export function golfStringListLiteral(useTextSplitWhitespace = true): Plugin {
  return {
    name: "golfStringListLiteral",
    visit(node) {
      if (
        node.kind === "ListConstructor" &&
        node.exprs.every((x) => isTextLiteral(x))
      ) {
        const strings = (node.exprs as TextLiteral[]).map((x) => x.value);
        const delim = getDelim(strings, useTextSplitWhitespace);
        return delim === true
          ? polygolfOp("text_split_whitespace", text(strings.join(" ")))
          : polygolfOp("text_split", text(strings.join(delim)), text(delim));
      }
    },
  };
}

function getDelim(
  strings: string[],
  useTextSplitWhitespace = true
): string | true {
  const string = strings.join("");
  if (!/\s/.test(string) && useTextSplitWhitespace) return true;
  for (let i = 32; i < 127; i++) {
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
