import { type Token, defaultDetokenizer } from "../../common/Language";
import { PythonEmitter } from "../python/emit";
import type { CompilationContext } from "../../common/compile";

export class CoconutEmitter extends PythonEmitter {
  detokenize = (tokens: Token[], context: CompilationContext) =>
    defaultDetokenizer((a, b) => {
      a = a[a.length - 1];
      b = b[0];
      if (/\d/.test(a) && /[a-zA-Z]/.test(b)) return false;
      return /\w/.test(a) && /\w/.test(b);
    })(
      context.options.objective === "chars"
        ? tokens.map(
            (token) =>
              (
                ({
                  "|>": "↦",
                  "=>": "⇒",
                  "->": "→",
                  "**": "↑",
                  "!=": "≠",
                  "<=": "≤",
                  ">=": "≥",
                  "<<": "«",
                  ">>": "»",
                  lambda: "λ",
                }) as any
              )[token] ?? token,
          )
        : tokens,
    );
}
