import moo from "moo";

const tokenTable = {
  number: /[0-9]+/,
  sin: "sin",
  times: "*",
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
