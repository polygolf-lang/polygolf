import nearley from "nearley";
import {
  binaryOp,
  builtinBinopArray,
  Expr,
  functionCall,
  Identifier,
  Program,
  Statement,
  print,
  assignment,
  forRange,
  Block,
  ifStatement,
} from "../IR";
import grammar from "./grammar";

export function sexpr(
  callee: Identifier,
  args: (Expr | Block)[]
): Expr | Statement {
  function expectArity(n: number) {
    if (args.length !== n) {
      throw new Error(
        `Invalid argument count in application of ${callee.name}: ` +
          `Expected ${n} but got ${args.length}.`
      );
    }
  }
  function assertIdentifier(e: Expr | Block): asserts e is Identifier {
    if (e.type !== "Identifier")
      throw new Error(
        `Application first argument must be identifier, but got ${args[0].type}`
      );
  }
  function assertExpr(e: Expr | Block): asserts e is Expr {
    if (e.type === "Block")
      throw new Error(
        `Application ${callee.name} cannot take a block as argument`
      );
  }
  function assertExprs(e: (Expr | Block)[]): asserts e is Expr[] {
    e.forEach(assertExpr);
  }
  function assertBlock(e: Expr | Block): asserts e is Block {
    if (e.type !== "Block")
      throw new Error(
        `Application ${callee.name} requires a block where you passed a non-block`
      );
  }
  switch (callee.name) {
    case "forRange": {
      expectArity(5);
      const [variable, low, high, increment, body] = args;
      assertIdentifier(variable);
      assertExpr(low);
      assertExpr(high);
      assertExpr(increment);
      assertBlock(body);
      return forRange(variable, low, high, increment, body);
    }
    case "if": {
      expectArity(2);
      const [condition, consequent] = args;
      assertExpr(condition);
      assertBlock(consequent);
      return ifStatement(condition, consequent);
    }
    // TODO: while, if-else, for-keys, etc.
  }
  assertExprs(args);
  if (!callee.builtin) {
    return functionCall(null, args, callee);
  } else if (builtinBinopArray.includes(callee.name)) {
    expectArity(2);
    return binaryOp(callee.name, args[0], args[1]);
  }
  switch (callee.name) {
    case "println":
    case "print":
      expectArity(1);
      return print(args[0], callee.name === "println");
    case "assign":
      expectArity(2);
      assertIdentifier(args[0]);
      return assignment(args[0], args[1]);
    default:
      throw new Error(`Unrecognized builtin: ${callee.name}`);
  }
}

export default function parse(code: string) {
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
  parser.feed(code);
  const results = parser.results;
  if (results.length > 1) throw new Error("Ambiguous parse of code");
  if (results.length === 0) throw new Error("Unexpected end of code");
  return results[0] as Program;
}
