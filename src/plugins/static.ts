import { getOutput } from "../interpreter";
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
          ? op("split_whitespace", text(strings.join(" ")))
          : op("split", text(strings.join(delim)), text(delim));
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
  ...ops: ("at[byte]" | "at[codepoint]" | "find[byte]" | "find[codepoint]")[]
): Plugin {
  ops =
    ops.length > 0
      ? ops
      : ["at[byte]", "at[codepoint]", "find[byte]", "find[codepoint]"];
  return {
    name: `listOpsToTextOps(${JSON.stringify(ops)})`,
    visit(node) {
      if (
        isOp("at[List]", "find[List]")(node) &&
        node.args[0].kind === "List" &&
        node.args[0].exprs.every(isText())
      ) {
        const texts = node.args[0].exprs.map((x) => x.value);
        if (texts.every((x) => charLength(x) === 1)) {
          const joined = text(texts.join(""));
          if (texts.every((x) => byteLength(x) === 1)) {
            if (node.op === "at[List]" && ops.includes("at[byte]"))
              return op("at[byte]", joined, node.args[1]);
            if (node.op === "find[List]" && ops.includes("find[byte]"))
              return op("find[byte]", joined, node.args[1]);
          }
          if (node.op === "at[List]" && ops.includes("at[codepoint]"))
            return op("at[codepoint]", joined, node.args[1]);
          if (node.op === "find[List]" && ops.includes("find[codepoint]"))
            return op("find[codepoint]", joined, node.args[1]);
        }
      }
    },
  };
}

export function hardcode(): Plugin {
  return {
    name: "hardcode",
    visit(node, spine, context) {
      context.skipChildren();
      if (!isOp("print[Text]")(node) || !isText()(node.args[0])) {
        try {
          const output = getOutput(node);
          if (output !== "") return op("print[Text]", text(output));
        } catch {}
      }
    },
  };
}
