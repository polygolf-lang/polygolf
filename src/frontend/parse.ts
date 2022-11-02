import { PolygolfError } from "../common/errors";
import { Token } from "moo";
import nearley from "nearley";
import {
  Expr,
  functionCall,
  Identifier,
  Program,
  forRange,
  Block,
  ifStatement,
  listConstructor,
  polygolfOp,
  ValueType,
  listType,
  arrayType,
  tableType,
  setType,
  integerType as intType,
  IntegerLiteral,
  int,
  assignment,
  OpCode,
  PolygolfOp,
  block,
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
} from "../IR";
import grammar from "./grammar";

export function sexpr(callee: Identifier, args: (Expr | Block)[]): Expr {
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
  function assertIdentifier(e: Expr | Block): asserts e is Identifier {
    if (e.type !== "Identifier")
      throw new PolygolfError(
        `Syntax error. Application first argument must be identifier, but got ${args[0].type}`,
        e.source
      );
  }
  function assertExpr(e: Expr | Block): asserts e is Expr {
    if (e.type === "Block")
      throw new PolygolfError(
        `Syntax error. Application ${opCode} cannot take a block as argument`,
        e.source
      );
  }
  function assertExprs(e: (Expr | Block)[]): asserts e is Expr[] {
    e.forEach(assertExpr);
  }
  function assertKeyValues(e: Expr[]): asserts e is KeyValue[] {
    for (const x of e) {
      if (x.type !== "KeyValue")
        throw new PolygolfError(
          `Syntax error. Application ${opCode} requires list of key-value pairs as argument`,
          x.source
        );
    }
  }
  function assertBlock(e: Expr | Block): asserts e is Block {
    if (e.type !== "Block")
      throw new PolygolfError(
        `Syntax error. Application ${opCode} requires a block where you passed a non-block`,
        e.source
      );
  }
  switch (opCode) {
    case "for": {
      expectArity(4, 5);
      let variable, low, high, increment, body: Expr | Block;
      if (args.length === 5) {
        [variable, low, high, increment, body] = args;
      } else {
        [variable, low, high, body] = args;
        increment = int(1n);
      }
      assertIdentifier(variable);
      assertExpr(low);
      assertExpr(high);
      assertExpr(increment);
      assertBlock(body);
      return forRange(variable, low, high, increment, body);
    }
    case "if": {
      expectArity(2, 3);
      const condition = args[0];
      const consequent = args[1];
      const alternate = args[2] ?? block([]);
      assertExpr(condition);
      assertBlock(consequent);
      assertBlock(alternate);
      return ifStatement(condition, consequent, alternate);
    }
    case "while": {
      expectArity(2);
      const [condition, body] = args;
      assertExpr(condition);
      assertBlock(body);
      return whileLoop(condition, body);
    }
  }
  assertExprs(args);
  if (!callee.builtin) {
    return functionCall(args, callee);
  }
  switch (opCode) {
    case "key_value":
      expectArity(2);
      return keyValue(args[0], args[1]);
    case "assign":
      expectArity(2);
      assertIdentifier(args[0]);
      return assignment(args[0], args[1]);
    case "list":
      return listConstructor(args);
    case "array":
      expectArity(1, Infinity);
      return listConstructor(args);
    case "set":
      return setConstructor(args);
    case "table":
      assertKeyValues(args);
      return tableConstructor(args);
  }
  if (isOpCode(opCode)) {
    if (isBinary(opCode)) {
      const allowNary = [
        "add",
        "mul",
        "bit_and",
        "bit_or",
        "bit_xor",
        "text_concat",
      ].includes(opCode);
      expectArity(2, allowNary ? Infinity : 2);
      return composedPolygolfOp(opCode, args);
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
  "^": "exp",
  "&": "bit_and",
  "|": "bit_or",
  // bitxor, bitnot handled as special case in canonicalOp
  "==": "eq",
  "!=": "neq",
  "<=": "leq",
  "<": "lt",
  ">=": "geq",
  ">": "gt",
  "#": "list_length",
  "..": "text_concat",
};

function canonicalOp(op: string, arity: number): string {
  if (op === "<-") return "assign";
  if (op === "=>") return "key_value";
  if (op === "-") return arity < 2 ? "neg" : "sub";
  if (op === "~") return arity < 2 ? "bit_not" : "bit_xor";
  return canonicalOpTable[op] ?? op;
}

function composedPolygolfOp(op: OpCode, args: Expr[]): PolygolfOp {
  if (args.length < 3) return polygolfOp(op, ...args);
  return polygolfOp(
    op,
    composedPolygolfOp(op, args.slice(0, -1)),
    args[args.length - 1]
  );
}

export function typeSexpr(
  callee: Token,
  args: (ValueType | IntegerLiteral)[]
): ValueType {
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
  function assertNumber(
    e: ValueType | IntegerLiteral
  ): asserts e is IntegerLiteral {
    if (e.type !== "IntegerLiteral")
      throw new PolygolfError(`Syntax error. Expected number, got type.`, {
        line: callee.line,
        column: callee.col,
      });
  }
  function assertType(e: ValueType | IntegerLiteral): asserts e is ValueType {
    if (e.type === "IntegerLiteral")
      throw new PolygolfError(`Syntax error. Expected type, got number.`, {
        line: callee.line,
        column: callee.col,
      });
  }
  switch (callee.value) {
    case "Void":
      expectArity(0);
      return voidType;
    case "Text":
      expectArity(0, 1);
      if (args.length === 0) return textType();
      assertNumber(args[0]);
      return textType(Number(args[0].value));
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
      if (args[0].type === "integer") return tableType(args[0], args[1]);
      if (args[0].type === "text") return tableType(args[0], args[1]);
      throw new PolygolfError("Unexpected key type for table.");
    case "Set":
      expectArity(1);
      assertType(args[0]);
      return setType(args[0]);
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

export function annotate(expr: Expr, valueType: [any, ValueType] | null): Expr {
  if (valueType === null) return expr;
  return { ...expr, valueType: valueType[1] };
}

export function integerType(
  low: "-oo" | "-∞" | IntegerLiteral,
  high: "oo" | "∞" | IntegerLiteral
): ValueType {
  return intType(
    typeof low === "string" ? undefined : low.value,
    typeof high === "string" ? undefined : high.value
  );
}

export function refSource(node: Node, token: Token): Node {
  node.source = { line: token.line, column: token.col };
  return node;
}

export default function parse(code: string) {
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
  parser.feed(code);
  const results = parser.results;
  if (results.length > 1) throw new Error("Ambiguous parse of code");
  if (results.length === 0) throw new Error("Unexpected end of code");
  return results[0] as Program;
}
