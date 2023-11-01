import { isOp, op, text, isText } from "../IR";
import { type Plugin } from "../common/Language";
import { byteLength, charLength } from "../common/objective";

export function golfStringListLiteral(useTextSplitWhitespace = true): Plugin {
  return {
    name: "golfStringListLiteral",
    visit(node) {
      if (node.kind === "List" && node.exprs.every(isText())) {
        const strings = node.exprs.map((x) => x.value);
        const delim = getDelim(strings, useTextSplitWhitespace);
        return delim === true
          ? op("text_split_whitespace", text(strings.join(" ")))
          : op("text_split", text(strings.join(delim)), text(delim));
      }
    },
  };
}

function getDelim(
  strings: string[],
  useTextSplitWhitespace = true,
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

export function listOpsToTextOps(
  ...ops: (
    | "text_get_byte"
    | "text_get_codepoint"
    | "text_byte_find"
    | "text_codepoint_find"
  )[]
): Plugin {
  ops =
    ops.length > 0
      ? ops
      : [
          "text_get_byte",
          "text_get_codepoint",
          "text_byte_find",
          "text_codepoint_find",
        ];
  return {
    name: `listOpsToTextOps(${JSON.stringify(ops)})`,
    visit(node) {
      if (
        isOp("list_get", "list_find")(node) &&
        node.args[0].kind === "List" &&
        node.args[0].exprs.every(isText())
      ) {
        const texts = node.args[0].exprs.map((x) => x.value);
        if (texts.every((x) => charLength(x) === 1)) {
          const joined = text(texts.join(""));
          if (texts.every((x) => byteLength(x) === 1)) {
            if (node.op === "list_get" && ops.includes("text_get_byte"))
              return op("text_get_byte", joined, node.args[1]);
            if (node.op === "list_find" && ops.includes("text_byte_find"))
              return op("text_byte_find", joined, node.args[1]);
          }
          if (node.op === "list_get" && ops.includes("text_get_codepoint"))
            return op("text_get_codepoint", joined, node.args[1]);
          if (node.op === "list_find" && ops.includes("text_codepoint_find"))
            return op("text_codepoint_find", joined, node.args[1]);
        }
      }
    },
  };
}
