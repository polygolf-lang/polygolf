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
  id,
  arrayConstructor,
  toString,
  forArgv,
  isAssociative,
  isFrontend,
  implicitConversion,
  varDeclaration,
  varDeclarationWithAssignment,
  varDeclarationBlock,
  manyToManyAssignment,
  oneToManyAssignment,
  mutatingBinaryOp,
  indexCall,
  rangeIndexCall,
  binaryOp,
  importStatement,
  forDifferenceRange,
  forEach,
  forEachPair,
  forEachKey,
  forCLike,
  namedArg,
  methodCall,
  unaryOp,
  propertyCall,
  relationOpChain,
} from "../IR";
import grammar from "./grammar";

let restrictedFrontend = true;
export function sexpr(callee: Identifier, args: readonly Expr[]): Expr {
  if (!callee.builtin) {
    return functionCall(callee, args);
  }
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
  function asString(e: Expr): string {
    if (e.kind === "TextLiteral") return e.value;
    throw new PolygolfError(
      `Syntax error. Expected string literal, but got ${e.kind}`,
      e.source
    );
  }
  function asArray(e: Expr): readonly Expr[] {
    if (e.kind === "Variants" && e.variants.length === 1) {
      return e.variants[0].kind === "Block"
        ? e.variants[0].children
        : [e.variants[0]];
    }
    throw new PolygolfError(
      `Syntax error. Expected single variant block, but got ${e.kind}`,
      e.source
    );
  }

  switch (opCode) {
    case "key_value":
      expectArity(2);
      return keyValue(args[0], args[1]);
    case "func": {
      expectArity(1, Infinity);
      const idents = args.slice(0, args.length);
      const expr = args[args.length - 1];
      assertIdentifiers(idents);
      return func(idents, expr);
    }
    case "assign":
      expectArity(2);
      assertIdentifier(args[0]);
      return assignment(args[0], args[1]);
    case "function_call": {
      expectArity(1, Infinity);
      assertIdentifier(args[0]);
      return functionCall(args[0], args.slice(1));
    }
    case "array":
      expectArity(1, Infinity);
      return arrayConstructor(args);
    case "list":
      return listConstructor(args);
    case "set":
      return setConstructor(args);
    case "table":
      assertKeyValues(args);
      return tableConstructor(args);
    case "conditional":
    case "unsafe_conditional":
      expectArity(3);
      return conditional(args[0], args[1], args[2], opCode === "conditional");
    case "while":
      expectArity(2);
      return whileLoop(args[0], args[1]);
    case "for": {
      expectArity(4, 5);
      let variable, start, end, step, body: Expr;
      if (args.length === 5) {
        [variable, start, end, step, body] = args;
      } else {
        [variable, start, end, body] = args;
        step = int(1n);
      }
      assertIdentifier(variable);
      return forRange(variable, start, end, step, body);
    }
    case "for_argv": {
      expectArity(3);
      const [variable, upperBound, body] = args;
      assertIdentifier(variable);
      assertInteger(upperBound);
      return forArgv(variable, Number(upperBound.value), body);
    }
    case "if": {
      expectArity(2, 3);
      const condition = args[0];
      const consequent = args[1];
      const alternate = args[2];
      return ifStatement(condition, consequent, alternate);
    }
  }
  if (!restrictedFrontend)
    switch (opCode) {
      case "implicit_conversion":
        expectArity(2);
        return implicitConversion(asString(args[0]) as any, args[1]);
      case "var_declaration":
        expectArity(1);
        assertIdentifier(args[0]);
        return varDeclaration(args[0], args[0].type as any);
      case "var_declaration_with_assignment":
        expectArity(1);
        return varDeclarationWithAssignment(args[0] as any);
      case "var_declaration_block":
        return varDeclarationBlock(args as any);
      case "many_to_many_assignment": {
        expectArity(2);
        const vars = asArray(args[0]);
        const exprs = asArray(args[1]);
        assertIdentifiers(vars); // TODO too strict?
        return manyToManyAssignment(vars, exprs);
      }
      case "one_to_many_assignment": {
        expectArity(2);
        const vars = asArray(args[0]);
        const expr = args[1];
        assertIdentifiers(vars); // TODO too strict?
        return oneToManyAssignment(vars, expr);
      }
      case "mutating_binary_op":
        expectArity(3);
        assertIdentifier(args[1]);
        return mutatingBinaryOp(asString(args[0]), args[1], args[2]);
      case "index_call":
      case "index_call_one_indexed":
        expectArity(2);
        return indexCall(args[0], args[1], opCode === "index_call_one_indexed");
      case "range_index_call":
      case "range_index_call_one_indexed":
        expectArity(4);
        return rangeIndexCall(
          args[0],
          args[1],
          args[2],
          args[3],
          opCode === "range_index_call_one_indexed"
        );
      case "property_call":
        expectArity(2);
        return propertyCall(args[0], asString(args[1]));
      case "method_call":
        expectArity(2, Infinity);
        return methodCall(args[0], asString(args[1]), ...args.slice(2));
      case "binary_op":
        expectArity(3);
        return binaryOp(asString(args[0]), args[1], args[2]);
      case "unary_op":
        expectArity(2);
        return unaryOp(asString(args[0]), args[1]);
      case "relation_op_chain":
        expectArity(2);
        return relationOpChain(
          asArray(args[0]),
          asArray(args[1]).map(asString) as any
        );
      case "builtin":
      case "id":
        expectArity(1);
        return id(asString(args[0]), opCode === "builtin");
      case "import_statement":
        expectArity(2, Infinity);
        return importStatement(asString(args[0]), args.slice(1).map(asString));
      case "for_range_inclusive": {
        expectArity(5);
        const [variable, start, end, step, body] = args;
        assertIdentifier(variable);
        return forRange(variable, start, end, step, body, true);
      }
      case "for_difference_range": {
        expectArity(5);
        const [variable, start, difference, step, body] = args;
        assertIdentifier(variable);
        return forDifferenceRange(
          variable,
          start,
          difference,
          step,
          body,
          true
        );
      }
      case "for_each": {
        expectArity(3);
        const [variable, collection, body] = args;
        assertIdentifier(variable);
        return forEach(variable, collection, body);
      }
      case "for_each_key": {
        expectArity(3);
        const [variable, collection, body] = args;
        assertIdentifier(variable);
        return forEachKey(variable, collection, body);
      }
      case "for_each_pair": {
        expectArity(4);
        const [keyVariable, valueVariable, collection, body] = args;
        assertIdentifier(keyVariable);
        assertIdentifier(valueVariable);
        return forEachPair(keyVariable, valueVariable, collection, body);
      }
      case "for_c_like": {
        expectArity(4);
        const [init, condition, append, body] = args;
        return forCLike(init, condition, append, body);
      }
      case "named_arg":
        expectArity(2);
        return namedArg(asString(args[0]), args[1]);
    }
  if (isOpCode(opCode) && (!restrictedFrontend || isFrontend(opCode))) {
    if (opCode === "argv_get" && restrictedFrontend) {
      assertInteger(args[0]);
    }
    if (isBinary(opCode)) {
      expectArity(2, isAssociative(opCode) ? Infinity : 2);
      return polygolfOp(opCode, ...args);
    }
    const ar = arity(opCode);
    expectArity(ar, ar === -1 ? Infinity : ar);
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

export default function parse(code: string, restrictFrontend = true) {
  restrictedFrontend = restrictFrontend;
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
