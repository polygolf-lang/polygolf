import { type Token, defaultDetokenizer } from "../../common/Language";
import { PythonEmitter } from "../python/emit";
import type { CompilationContext } from "../../common/compile";

export class CoconutEmitter extends PythonEmitter {
  detokenize = (tokens: Token[], context: CompilationContext) =>
    defaultDetokenizer()(
      context.options.objective === "chars"
        ? tokens.map(
            (token) =>
              (
                ({
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
