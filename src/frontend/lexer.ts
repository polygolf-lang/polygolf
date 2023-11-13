import moo from "moo";

const tokenTable = {
  integer:
    /0|-?[1-9]\d*(?:[eE][1-9]\d*)?|-?0x[1-9a-fA-F][\da-fA-F]*|-?0b1[01]*/,
  string: /"(?:\\.|[^"])*"/,
  variable: /\$\w+/,
  "at[argv]": "at[argv]",
  nullary: [
    "argv",
    "argc",
    "true",
    "false",
    "read[codepoint]",
    "read[byte]",
    "read[Int]",
    "read[line]",
  ],
  ninf: ["-oo", "-∞"],
  pinf: ["oo", "∞"],
  variant: "/",
  opalias:
    "<- + - * ^ & | ~ >> << == != <= < >= > => # @ mod rem div trunc_div in".split(
      " ",
    ),
  builtin: /[a-z0-9_]+([A-Za-z][a-z]*)?/,
  type: /[A-Z][a-z]*/,
  lparen: "(",
  rparen: ")",
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
