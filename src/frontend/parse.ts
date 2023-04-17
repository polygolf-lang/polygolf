import { PolygolfError } from "../common/errors";
import { Token } from "moo";
import nearley from "nearley";
import {
  Expr,
  functionCall,
  Identifier,
  Program,
  forRange,
  ifStatement,
  listConstructor,
  polygolfOp,
  Type,
  listType,
  arrayType,
  tableType,
  setType,
  integerType as intType,
  IntegerLiteral,
  int,
  assignment,
  OpCode,
  whileLoop,
  voidType,
  textType,
  booleanType,
  Node,
  keyValue,
  setConstructor,
  tableConstructor,
  KeyValue,
  isOpCode,
  isBinary,
  arity,
  functionType,
  func,
  conditional,
  frontendOpcodes,
  id,
  arrayConstructor,
  toString,
  forArgv,
  isAssociative,
} from "../IR";
import grammar from "./grammar";

let restrictFrontend = true;
export function sexpr(callee: Identifier, args: readonly Expr[]): Expr {
  const opCode = canonicalOp(callee.name, args.length);
  function expectArity(low: number, high: number = low) {
    if (args.length < low || args.length > high) {
      throw new PolygolfError(
        `Syntax error. Invalid argument count in application of ${opCode}: ` +
          `Expected ${low}${low === high ? "" : ".." + String(high)} but got ${
            args.length
          }.`,
        callee.source
      );
    }
  }
  function assertIdentifier(e: Expr): asserts e is Identifier {
    if (e.kind !== "Identifier")
      throw new PolygolfError(
        `Syntax error. Application first argument must be identifier, but got ${args[0].kind}`,
        e.source
      );
  }
  function assertInteger(e: Expr): asserts e is IntegerLiteral {
    if (e.kind !== "IntegerLiteral")
      throw new PolygolfError(
        `Syntax error. Expected integer literal, but got ${e.kind}`,
        e.source
      );
  }
  function assertIdentifiers(e: readonly Expr[]): asserts e is Identifier[] {
    e.forEach(assertIdentifier);
  }
  function assertKeyValues(e: readonly Expr[]): asserts e is KeyValue[] {
    for (const x of e) {
      if (x.kind !== "KeyValue")
        throw new PolygolfError(
          `Syntax error. Application ${opCode} requires list of key-value pairs as argument`,
          x.source
        );
    }
  }
  if (!callee.builtin) {
    return functionCall(args, callee);
  }
  switch (opCode) {
    case "func": {
      expectArity(1, Infinity);
      const idents = args.slice(0, args.length - 1);
      const expr = args[args.length - 1];
      assertIdentifiers(idents);
      return func(idents, expr);
    }
    case "for": {
      expectArity(4, 5);
      let variable, low, high, increment, body: Expr;
      if (args.length === 5) {
        [variable, low, high, increment, body] = args;
      } else {
        [variable, low, high, body] = args;
        increment = int(1n);
      }
      assertIdentifier(variable);
      return forRange(variable, low, high, increment, body);
    }
    case "if": {
      expectArity(2, 3);
      const condition = args[0];
      const consequent = args[1];
      const alternate = args[2];
      return ifStatement(condition, consequent, alternate);
    }
    case "while": {
      expectArity(2);
      const [condition, body] = args;
      return whileLoop(condition, body);
    }
    case "for_argv": {
      expectArity(3);
      const [variable, upperBound, body] = args;
      assertIdentifier(variable);
      assertInteger(upperBound);
      return forArgv(variable, Number(upperBound.value), body);
    }
    case "key_value":
      expectArity(2);
      return keyValue(args[0], args[1]);
    case "conditional":
    case "unsafe_conditional":
      expectArity(3);
      return conditional(args[0], args[1], args[2], opCode === "conditional");
    case "assign":
      expectArity(2);
      assertIdentifier(args[0]);
      return assignment(args[0], args[1]);
    case "list":
      return listConstructor(args);
    case "array":
      expectArity(1, Infinity);
      return arrayConstructor(args);
    case "set":
      return setConstructor(args);
    case "table":
      assertKeyValues(args);
      return tableConstructor(args);
    case "argv_get":
      expectArity(1);
      assertInteger(args[0]);
      return polygolfOp(opCode, ...args);
  }
  if (
    isOpCode(opCode) &&
    (!restrictFrontend || frontendOpcodes.includes(opCode))
  ) {
    if (isBinary(opCode)) {
      expectArity(2, isAssociative(opCode) ? Infinity : 2);
      return polygolfOp(opCode, ...args);
    }
    expectArity(arity(opCode));
    return polygolfOp(opCode, ...args);
  }
  throw new PolygolfError(
    `Syntax error. Unrecognized builtin: ${opCode}`,
    callee.source
  );
}

export const canonicalOpTable: Record<string, OpCode> = {
  "+": "add",
  // neg, sub handled as special case in canonicalOp
  "*": "mul",
  "^": "pow",
  "&": "bit_and",
  "|": "bit_or",
  "<<": "bit_shift_left",
  ">>": "bit_shift_right",
  // bitxor, bitnot handled as special case in canonicalOp
  "==": "eq",
  "!=": "neq",
  "<=": "leq",
  "<": "lt",
  ">=": "geq",
  ">": "gt",
  "#": "list_length",
  "..": "concat",
};

function canonicalOp(op: string, arity: number): string {
  if (op === "<-") return "assign";
  if (op === "=>") return "key_value";
  if (op === "-") return arity < 2 ? "neg" : "sub";
  if (op === "~") return arity < 2 ? "bit_not" : "bit_xor";
  return canonicalOpTable[op] ?? op;
}

export function userIdentifier(token: Token): Identifier {
  const name = token.value.slice(1);
  if (name.includes("POLYGOLF") && restrictFrontend) {
    throw new PolygolfError(
      `Parse error. Variable names cannot contain 'POLYGOLF'`,
      {
        line: token.line,
        column: token.col,
      }
    );
  }
  return id(name, false);
}

export function typeSexpr(
  callee: Token,
  args: (Type | IntegerLiteral)[]
): Type {
  function expectArity(low: number, high: number = low) {
    if (args.length < low || args.length > high) {
      throw new PolygolfError(
        `Syntax error. Invalid argument count in application of ${callee.value}: ` +
          `Expected ${low}${low === high ? "" : ".." + String(high)} but got ${
            args.length
          }.`,
        { line: callee.line, column: callee.col }
      );
    }
  }
  function assertNumber(e: Type | IntegerLiteral): asserts e is IntegerLiteral {
    if (e.kind !== "IntegerLiteral")
      throw new PolygolfError(`Syntax error. Expected number, got type.`, {
        line: callee.line,
        column: callee.col,
      });
  }
  function assertTypes(e: (Type | IntegerLiteral)[]): asserts e is Type[] {
    e.forEach(assertType);
  }
  function assertType(e: Type | IntegerLiteral): asserts e is Type {
    if (e.kind === "IntegerLiteral")
      throw new PolygolfError(`Syntax error. Expected type, got number.`, {
        line: callee.line,
        column: callee.col,
      });
  }
  switch (callee.value) {
    case "Void":
      expectArity(0);
      return voidType;
    case "Int":
      expectArity(0);
      return intType();
    case "Ascii":
    case "Text":
      expectArity(0, 1);
      if (args.length === 0)
        return textType(intType(), callee.value === "Ascii");
      if (args[0].kind === "IntegerLiteral")
        return textType(Number(args[0].value), callee.value === "Ascii");
      if (args[0].kind === "integer")
        return textType(args[0], callee.value === "Ascii");
      throw new PolygolfError(
        `Syntax error. Expected integer or integer type, got ${toString(
          args[0]
        )}.`,
        {
          line: callee.line,
          column: callee.col,
        }
      );
    case "Bool":
      expectArity(0);
      return booleanType;
    case "Array":
      expectArity(2);
      assertType(args[0]);
      assertNumber(args[1]);
      return arrayType(args[0], Number(args[1].value));
    case "List":
      expectArity(1);
      assertType(args[0]);
      return listType(args[0]);
    case "Table":
      expectArity(2);
      assertType(args[0]);
      assertType(args[1]);
      if (args[0].kind === "integer") return tableType(args[0], args[1]);
      if (args[0].kind === "text") return tableType(args[0], args[1]);
      throw new PolygolfError("Unexpected key type for table.");
    case "Set":
      expectArity(1);
      assertType(args[0]);
      return setType(args[0]);
    case "Func":
      expectArity(1, Infinity);
      assertTypes(args);
      return functionType(
        args.slice(0, args.length - 1),
        args[args.length - 1]
      );
    default:
      throw new PolygolfError(
        `Syntax error. Unrecognized type: ${callee.value}`,
        {
          line: callee.line,
          column: callee.col,
        }
      );
  }
}

export function annotate(expr: Expr, valueType: [any, Type] | null): Expr {
  if (valueType === null) return expr;
  return { ...expr, type: valueType[1] };
}

export function integerType(
  low: "-oo" | "-∞" | IntegerLiteral,
  high: "oo" | "∞" | IntegerLiteral
): Type {
  return intType(
    typeof low === "string" ? undefined : low.value,
    typeof high === "string" ? undefined : high.value
  );
}

export function refSource(node: Node, ref?: Token | Node): Node {
  if (ref === undefined) return node;
  const source =
    "line" in ref ? { line: ref.line, column: ref.col } : ref.source;
  return {
    ...node,
    source,
  };
}

export default function parse(code: string, restrictedFrontend = true) {
  restrictFrontend = restrictedFrontend;
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
  try {
    parser.feed(code);
  } catch (e) {
    if (e instanceof Error && "token" in e) {
      const token: Token = (e as any).token;
      // https://stackoverflow.com/a/72016226/14611638
      const expected = [
        ...new Set(
          ((e as any).message.match(/(?<=A ).*(?= based on:)/g) ?? []).map(
            (s: string) => s.replace(/\s+token/i, "")
          )
        ),
      ];
      let message = `Unexpected token ${JSON.stringify(token.text)}.`;
      if (expected.length > 0) {
        message += ` Expected one of ${expected.join(", ")}.`;
      }
      throw new PolygolfError(message, {
        line: token.line,
        column: token.col,
      });
    } else {
      throw e;
    }
  }
  const results = parser.results;
  if (results.length > 1) {
    throw new Error("Ambiguous parse of code"); // this is most likely an error in the grammar
  }
  if (results.length === 0) {
    const lines = code.split("\n");
    throw new PolygolfError("Unexpected end of code", {
      line: lines.length + 1,
      column: (lines.at(-1)?.length ?? 0) + 1,
    });
  }
  return results[0] as Program;
}
