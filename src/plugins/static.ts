import {
  isPolygolfOp,
  polygolfOp,
  TextLiteral,
  text,
  isTextLiteral,
} from "../IR";
import { Plugin } from "../common/Language";
import { byteLength, charLength } from "../common/applyLanguage";

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
        isPolygolfOp(node, "list_get", "list_find") &&
        node.args[0].kind === "ListConstructor" &&
        node.args[0].exprs.every((x) => x.kind === "TextLiteral")
      ) {
        const texts = node.args[0].exprs.map((x) => (x as TextLiteral).value);
        const joined = text(texts.join(""));
        if (texts.every((x) => charLength(x) === 1)) {
          if (texts.every((x) => byteLength(x) === 1)) {
            if (node.op === "list_get" && ops.includes("text_get_byte"))
              return polygolfOp("text_get_byte", joined, node.args[1]);
            if (node.op === "list_find" && ops.includes("text_byte_find"))
              return polygolfOp("text_byte_find", joined, node.args[1]);
          }
          if (node.op === "list_get" && ops.includes("text_get_codepoint"))
            return polygolfOp("text_get_codepoint", joined, node.args[1]);
          if (node.op === "list_find" && ops.includes("text_codepoint_find"))
            return polygolfOp("text_codepoint_find", joined, node.args[1]);
        }
      }
    },
  };
}
