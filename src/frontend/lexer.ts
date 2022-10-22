import moo from "moo";

const tokenTable = {
  integer: /-?[0-9]+/,
  string: /"(?:\\.|[^"])*"/,
  variable: /\$\w*/,
  builtin: /\w+/,
  lparen: "(",
  rparen: ")",
  lbracket: "[",
  rbracket: "]",
  lbrace: "{",
  rbrace: "}",
  pipe: "|",
  colon: ":",
  range: "..",
  semicolon: ";",
  whitespace: {
    match: /\s/,
    lineBreaks: true,
  },
} as const;

const lexer = moo.compile(tokenTable);
// override next to skip whitespace
const currNext = lexer.next.bind(lexer);
lexer.next = function () {
  let next = currNext();
  while (next?.type === "whitespace") {
    next = currNext();
  }
  return next;
};

export default lexer;
