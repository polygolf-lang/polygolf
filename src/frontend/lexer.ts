import { NullaryOpCodes, type OpCodeFrontName } from "../IR";
import moo from "moo";

export const infixableOpCodeNames = [
  "+",
  "-",
  "*",
  "^",
  "&",
  "|",
  "~",
  ">>",
  "<<",
  "==",
  "!=",
  "<=",
  "<",
  ">=",
  ">",
  "#",
  "@",
  "..",
  "..<",
  "mod",
  "rem",
  "div",
  "trunc_div",
] as const satisfies readonly OpCodeFrontName[];

const tokenTable = {
  integer:
    /0|-?[1-9]\d*(?:[eE][1-9]\d*)?|-?0x[1-9a-fA-F][\da-fA-F]*|-?0b1[01]*/,
  string: /"(?:\\.|[^"])*"/,
  dollarExpr: /\$\$?[a-zA-Z]\w*|\$\d+/,
  for_argv: "for_argv",
  nullary: NullaryOpCodes,
  ninf: ["-oo", "-∞"],
  pinf: ["oo", "∞"],
  variant: "/",
  opalias: [
    ...infixableOpCodeNames.filter((x) => x !== ".."),
    ...infixableOpCodeNames.filter((x) => x !== "..").map((x) => x + "<-"),
    "<-",
    "=>",
  ],
  builtin: /(?:[a-z0-9_]|Hex)+(?:\[[A-Za-z][a-z]*\])?/,
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
