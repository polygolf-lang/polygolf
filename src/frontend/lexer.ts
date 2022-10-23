import moo from "moo";

const tokenTable = {
  integer: /-?[0-9]+/,
  string: /"(?:\\.|[^"])*"/,
  variable: /\$\w*/,
  type: ["Void", "Text", "Bool", "List", "Table", "Array", "Set"],
  nullary: ["argv", "true", "false"],
  ninf: ["-oo", "-∞"],
  pinf: ["oo", "∞"],
  variant: "/",
  opalias: "<- + - * ^ & | ~ == != <= < >= > # mod rem div truncdiv".split(" "),
  builtin: /\w+/,
  lparen: "(",
  rparen: ")",
  lbracket: "[",
  rbracket: "]",
  lbrace: "{",
  rbrace: "}",
  colon: ":",
  range: "..",
  semicolon: ";",
  comment: {
    match: /%.*?(?:$|\n)/,
    lineBreaks: true,
  },
  whitespace: {
    match: /\s/,
    lineBreaks: true,
  },
};

const lexer = moo.compile(tokenTable);
// override next to skip whitespace
const currNext = lexer.next.bind(lexer);
lexer.next = function () {
  let next = currNext();
  while (next?.type === "whitespace" || next?.type === "comment") {
    next = currNext();
  }
  return next;
};

export default lexer;
