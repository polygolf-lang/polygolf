import { flattenTree, type TokenTree } from "../../common/Language";

// Special tokens:
// SPACE_TYPOGRAPHY: converts to " ", or
//   "\\ " if it's preceded by a control word like \f or another SPACE_TYPOGRAPHY
// SPACE_ANTIGOBBLE: converts to " ", or "{}" if it's followed by a SPACE_TYPOGRAPHY
//   Intended to be placed after digits which are parts of numbers
//   Without the anti-gobble, TeX would keep trying to gobble tokens until it
//   reaches a non-digit. This includes expanding macros, so
//   `\newcount\x \def\f{\advance\x1 } \x5 \f \the\x,\the\x` prints '6,6', but
//   `\newcount\x  \def\f{\advance\x1} \x5 \f \the\x` prints ',20' (since 20=5+15)
// TODO-tex-improvement: anti-gobble spaces can often be removed, e.g. before an \advance.
//   Requires control flow analysis to do perfectly.

export const SPACE_TYPOGRAPHY = "$SPACE_TYPOGRAPHY$";
export const SPACE_ANTIGOBBLE = "$SPACE_ANTIGOBBLE$";

const controlWordRegex = /^\\[a-zA-Z]+$/;

export function texDetokenizer(tree: TokenTree): string {
  const tokens: string[] = flattenTree(tree);
  let result = tokens[0];
  for (let i = 1; i < tokens.length; i++) {
    result += token(tokens, i);
  }
  return result;
}

function token(tokens: string[], i: number) {
  switch (tokens[i]) {
    case SPACE_TYPOGRAPHY:
      if (
        controlWordRegex.test(tokens[i - 1]) ||
        tokens[i - 1] === SPACE_TYPOGRAPHY
      ) {
        return "\\ ";
      } else {
        return " ";
      }
    case SPACE_ANTIGOBBLE:
      if (i < tokens.length - 1 && tokens[i + 1] === SPACE_TYPOGRAPHY) {
        return "{}";
      } else {
        return " ";
      }
    default:
      return tokens[i];
  }
}
