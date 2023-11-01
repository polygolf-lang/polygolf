import { PolygolfError } from "../common/errors";
import { type Token } from "moo";
import nearley from "nearley";
import {
  functionCall,
  type Identifier,
  forRange,
  ifStatement,
  list,
  op,
  type Type,
  listType,
  arrayType,
  tableType,
  setType,
  integerType as intType,
  type Integer,
  int as integer,
  assignment,
  type OpCode,
  whileLoop,
  voidType,
  textType,
  booleanType,
  type Node,
  keyValue,
  set,
  table,
  type KeyValue,
  isOpCode,
  isBinary,
  arity,
  functionType,
  func,
  conditional,
  id,
  array,
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
  mutatingInfix,
  indexCall,
  rangeIndexCall,
  infix,
  importStatement,
  forDifferenceRange,
  forEach,
  forEachPair,
  forEachKey,
  forCLike,
  namedArg,
  methodCall,
  prefix,
  propertyCall,
  isText,
  anyInt,
  isIntLiteral,
  isIdent,
  postfix,
} from "../IR";
import grammar from "./grammar";

let restrictedFrontend = true;
export function sexpr(callee: Identifier, args: readonly Node[]): Node {
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
        callee.source,
      );
    }
  }
  function assertIdentifier(e: Node): asserts e is Identifier {
    if (!isIdent()(e))
      throw new PolygolfError(
        `Syntax error. Application first argument must be identifier, but got ${args[0].kind}`,
        e.source,
      );
  }
  function assertInteger(e: Node): asserts e is Integer {
    if (!isIntLiteral()(e))
      throw new PolygolfError(
        `Syntax error. Expected integer literal, but got ${e.kind}`,
        e.source,
      );
  }
  function assertIdentifiers(e: readonly Node[]): asserts e is Identifier[] {
    e.forEach(assertIdentifier);
  }
  function assertKeyValues(e: readonly Node[]): asserts e is KeyValue[] {
    for (const x of e) {
      if (x.kind !== "KeyValue")
        throw new PolygolfError(
          `Syntax error. Application ${opCode} requires list of key-value pairs as argument`,
          x.source,
        );
    }
  }
  function asString(e: Node): string {
    if (isText()(e)) return e.value;
    throw new PolygolfError(
      `Syntax error. Expected string literal, but got ${e.kind}`,
      e.source,
    );
  }
  function asArray(e: Node): readonly Node[] {
    if (e.kind === "Variants" && e.variants.length === 1) {
      return e.variants[0].kind === "Block"
        ? e.variants[0].children
        : [e.variants[0]];
    }
    throw new PolygolfError(
      `Syntax error. Expected single variant block, but got ${e.kind}`,
      e.source,
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
      return array(args);
    case "list":
      return list(args);
    case "set":
      return set(args);
    case "table":
      assertKeyValues(args);
      return table(args);
    case "conditional":
    case "unsafe_conditional":
      expectArity(3);
      return conditional(args[0], args[1], args[2], opCode === "conditional");
    case "while":
      expectArity(2);
      return whileLoop(args[0], args[1]);
    case "for": {
      expectArity(2, 5);
      let variable: Node = id("_");
      let start: Node = integer(0n);
      let step: Node = integer(1n);
      let end, body: Node;
      if (args.length === 5) {
        [variable, start, end, step, body] = args;
      } else if (args.length === 4) {
        [variable, start, end, body] = args;
      } else if (args.length === 3) {
        [variable, end, body] = args;
      } else {
        // args.length === 2
        [end, body] = args;
      }
      assertIdentifier(variable);
      return forRange(
        variable.name === "_" ? undefined : variable,
        start,
        end,
        step,
        body,
      );
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
    case "any_int": {
      expectArity(2);
      const [low, high] = args;
      assertInteger(low);
      assertInteger(high);
      return anyInt(low.value, high.value);
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
      case "mutating_infix":
        expectArity(3);
        assertIdentifier(args[1]);
        return mutatingInfix(asString(args[0]), args[1], args[2]);
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
          opCode === "range_index_call_one_indexed",
        );
      case "property_call":
        expectArity(2);
        return propertyCall(args[0], asString(args[1]));
      case "method_call":
        expectArity(2, Infinity);
        return methodCall(args[0], asString(args[1]), ...args.slice(2));
      case "infix":
        expectArity(3);
        return infix(asString(args[0]), args[1], args[2]);
      case "prefix":
        expectArity(2);
        return prefix(asString(args[0]), args[1]);
      case "postfix":
        expectArity(2);
        return postfix(asString(args[0]), args[1]);
      case "builtin":
      case "id":
        expectArity(1);
        return id(asString(args[0]), opCode === "builtin");
      case "import":
        expectArity(2, Infinity);
        return importStatement(asString(args[0]), args.slice(1).map(asString));
      case "for_range_inclusive": {
        expectArity(5);
        const [variable, start, end, step, body] = args;
        assertIdentifier(variable);
        return forRange(
          variable.name === "_" ? undefined : variable,
          start,
          end,
          step,
          body,
          true,
        );
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
          true,
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
      case "for_no_index": {
        expectArity(3, 4);
        let start, end, step, body: Node;
        if (args.length === 4) {
          [start, end, step, body] = args;
        } else {
          [start, end, body] = args;
          step = integer(1n);
        }
        return forRange(undefined, start, end, step, body);
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
      return op(opCode, ...args);
    }
    const ar = arity(opCode);
    expectArity(ar, ar === -1 ? Infinity : ar);
    return op(opCode, ...args);
  }
  throw new PolygolfError(
    `Syntax error. Unrecognized builtin: ${opCode}`,
    callee.source,
  );
}

function intValue(x: string): bigint {
  if (x[0] === "-") return -intValue(x.substring(1));
  if (x[0] === "0") return BigInt(x);
  const parts = x.toString().split(/[eE]/);
  return BigInt(parts[0]) * 10n ** BigInt(parts[1] ?? "0");
}

export function int(x: Token) {
  return integer(intValue(x.text));
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

export function typeSexpr(callee: Token, args: (Type | Integer)[]): Type {
  function expectArity(low: number, high: number = low) {
    if (args.length < low || args.length > high) {
      throw new PolygolfError(
        `Syntax error. Invalid argument count in application of ${callee.value}: ` +
          `Expected ${low}${low === high ? "" : ".." + String(high)} but got ${
            args.length
          }.`,
        { line: callee.line, column: callee.col },
      );
    }
  }
  function assertNumber(e: Type | Integer): asserts e is Integer {
    if (e.kind !== "Integer")
      throw new PolygolfError(`Syntax error. Expected number, got type.`, {
        line: callee.line,
        column: callee.col,
      });
  }
  function assertTypes(e: (Type | Integer)[]): asserts e is Type[] {
    e.forEach(assertType);
  }
  function assertType(e: Type | Integer): asserts e is Type {
    if (e.kind === "Integer")
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
      if (args[0].kind === "Integer")
        return textType(Number(args[0].value), callee.value === "Ascii");
      if (args[0].kind === "integer")
        return textType(args[0], callee.value === "Ascii");
      throw new PolygolfError(
        `Syntax error. Expected integer or integer type, got ${toString(
          args[0],
        )}.`,
        {
          line: callee.line,
          column: callee.col,
        },
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
        args[args.length - 1],
      );
    default:
      throw new PolygolfError(
        `Syntax error. Unrecognized type: ${callee.value}`,
        {
          line: callee.line,
          column: callee.col,
        },
      );
  }
}

export function annotate(expr: Node, valueType: [any, Type] | null): Node {
  if (valueType === null) return expr;
  return { ...expr, type: valueType[1] };
}

export function integerType(
  low: "-oo" | "-∞" | Integer,
  high: "oo" | "∞" | Integer,
): Type {
  return intType(
    typeof low === "string" ? undefined : low.value,
    typeof high === "string" ? undefined : high.value,
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
            (s: string) => s.replace(/\s+token/i, ""),
          ),
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
  return results[0] as Node;
}
