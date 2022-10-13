import nearley from "nearley";
import grammar from "./grammar";

export default function parse(code: string) {
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
  parser.feed(code);
  const results = parser.results;
  if (results.length > 1) throw new Error("Ambiguous parse of code");
  if (results.length === 0) throw new Error("Unexpected end of code");
  return results[0];
}
