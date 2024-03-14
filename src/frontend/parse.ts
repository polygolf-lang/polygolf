import { PolygolfError } from "../common/errors";
import { type Token } from "moo";
import nearley from "nearley";
import {
  functionCall,
  type Identifier,
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
  functionType,
  func,
  conditional,
  id,
  array,
  toString,
  forArgv,
  implicitConversion,
  varDeclaration,
  varDeclarationWithAssignment,
  varDeclarationBlock,
  manyToManyAssignment,
  oneToManyAssignment,
  indexCall,
  rangeIndexCall,
  infix,
  importStatement,
  forEach,
  forCLike,
  namedArg,
  methodCall,
  prefix,
  propertyCall,
  isText,
  anyInt,
  isInt,
  isIdent,
  postfix,
  type Text,
  type OpCodeFrontName,
  OpCodeFrontNamesToOpCodes,
  OpCodeFrontNames,
  userName,
  isOpCode,
  lengthToArrayIndexType,
  int as intNode,
  minArity,
  maxArity,
  cast,
  OpCodesUser,
} from "../IR";
import grammar from "./grammar";

let restrictedFrontend = true;
let warnings: Error[] = [];

/**
 * Returns a distinct union of ranges.
 *
 */
function normalizeRangeUnion(ranges: [number, number][]): [number, number][] {
  if (ranges.length < 1) return [];
  ranges.sort((a, b) => b[0] - a[0]);
  const res: [number, number][] = [ranges[0]];
  for (const [a, b] of ranges.slice(1)) {
    if (a > res.at(-1)![1]) {
      res.push([a, b]);
    } else if (b > res.at(-1)![1]) {
      res.at(-1)![1] = b;
    }
  }
  return res;
}

export function sexpr(
  calleeIdent: Identifier,
  args: readonly Node[],
  callee: string = calleeIdent.name,
): Node {
  if (!calleeIdent.builtin) {
    return functionCall(calleeIdent, ...args);
  }
  if (callee in deprecatedAliases) {
    const alias0 = deprecatedAliases[callee];
    const alias =
      typeof alias0 === "string"
        ? { opCode: alias0, callee: alias0, asRhsOfAssignment: false }
        : alias0;
    const uName = isOpCode(alias.opCode)
      ? userName(alias.opCode)
      : alias.opCode;
    warnings.push(
      new PolygolfError(
        `Deprecated alias used: ${callee}. Use ${alias.opCode} ${
          alias.opCode === uName ? "" : `or ${uName} `
        }${alias.asRhsOfAssignment ? "as RHS of an assignment " : ""}instead.`,
        calleeIdent.source,
      ),
    );
    callee = alias.callee;
  }
  if (callee === "<-") callee = "assign";
  if (callee === "=>") callee = "key_value";
  if (callee.endsWith("<-")) {
    return sexpr(
      calleeIdent,
      [args[0], sexpr(calleeIdent, args, callee.slice(0, callee.length - 2))],
      "<-",
    );
  }
  function expectArity(low: number, high: number = low) {
    if (args.length < low || args.length > high) {
      throw new PolygolfError(
        `Syntax error. Invalid argument count in application of ${callee}: ` +
          `Expected ${low}${low === high ? "" : ".." + String(high)} but got ${
            args.length
          }.`,
        calleeIdent.source,
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
    if (!isInt()(e))
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
          `Syntax error. Application ${callee} requires list of key-value pairs as argument`,
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

  switch (callee) {
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
      if (restrictedFrontend) assertIdentifier(args[0]);
      return functionCall(args[0], ...args.slice(1));
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
      return conditional(args[0], args[1], args[2], callee === "conditional");
    case "while":
      expectArity(2);
      return whileLoop(args[0], args[1]);
    case "for": {
      expectArity(2, 5);
      let variable: Node | undefined;
      let colllection: Node;
      let body: Node;
      if (args.length === 5) {
        const [variable0, low, high, step, body0] = args;
        variable = variable0;
        colllection = op.range_excl(low, high, step);
        body = body0;
        warnings.push(
          new PolygolfError(
            "Deprecated form of `for` used. Iterate over a range using `(low ..< high step)` instead.",
            calleeIdent.source,
          ),
        );
      } else if (args.length === 4) {
        const [variable0, low, high, body0] = args;
        variable = variable0;
        colllection = op.range_excl(low, high, intNode(1n));
        body = body0;
        warnings.push(
          new PolygolfError(
            "Deprecated form of `for` used. Iterate over a range using `(low ..< high)` instead.",
            calleeIdent.source,
          ),
        );
      } else if (args.length === 3) {
        [variable, colllection, body] = args;
      } else {
        // args.length === 2
        const [end, body0] = args;
        variable = undefined;
        colllection = op.range_excl(intNode(0n), end, intNode(1n));
        body = body0;
      }
      if (variable !== undefined) assertIdentifier(variable);
      return forEach(variable, colllection, body);
    }
    case "for[Ascii]":
    case "for[byte]":
    case "for[codepoint]": {
      expectArity(3);
      const [variable, text, body] = args;
      assertIdentifier(variable);
      return forEach(
        variable,
        op.unsafe(callee.replace("for", "text_to_list") as OpCode)(text),
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
    switch (callee) {
      case "cast":
        expectArity(1);
        return cast(args[0]);
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
      case "index_call":
        expectArity(2);
        return indexCall(args[0], args[1]);
      case "range_index_call":
        expectArity(4);
        return rangeIndexCall(args[0], args[1], args[2], args[3]);
      case "property_call":
        expectArity(2);
        return propertyCall(args[0], asString(args[1]));
      case "method_call":
        expectArity(2, Infinity);
        return methodCall(args[0], asString(args[1]), ...args.slice(2));
      case "infix":
        expectArity(3, Infinity);
        return infix(
          asString(args[0]),
          ...(args.slice(1) as [Node, Node, ...Node[]]),
        );
      case "prefix":
        expectArity(2);
        return prefix(asString(args[0]), args[1]);
      case "postfix":
        expectArity(2);
        return postfix(asString(args[0]), args[1]);
      case "builtin":
      case "id":
        expectArity(1);
        return id(asString(args[0]), callee === "builtin");
      case "import":
        expectArity(2, Infinity);
        return importStatement(asString(args[0]), args.slice(1).map(asString));
      case "for_c_like": {
        expectArity(4);
        const [init, condition, append, body] = args;
        return forCLike(init, condition, append, body);
      }
      case "named_arg":
        expectArity(2);
        return namedArg(asString(args[0]), args[1]);
    }
  let matchingOpCodes = OpCodeFrontNames.includes(callee)
    ? OpCodeFrontNamesToOpCodes[callee as OpCodeFrontName]
    : [];
  if (restrictedFrontend) {
    matchingOpCodes = matchingOpCodes.filter((opCode) =>
      OpCodesUser.includes(opCode),
    );
  }
  if (callee === "..") {
    // We special case .. here for backwards compat.
    matchingOpCodes.push("concat[List]", "concat[Text]", "append");
  }
  if (matchingOpCodes.length < 1) {
    throw new PolygolfError(
      `Syntax error. Unrecognized builtin: ${callee}`,
      calleeIdent.source,
    );
  }

  const arityMatchingOpCodes = matchingOpCodes.filter(
    (opCode) =>
      minArity(opCode) <= args.length && args.length <= maxArity(opCode),
  );
  if (arityMatchingOpCodes.length < 1) {
    const expectedArities = normalizeRangeUnion(
      matchingOpCodes.map((opCode) => [minArity(opCode), maxArity(opCode)]),
    );
    throw new PolygolfError(
      `Syntax error. Invalid argument count in application of ${callee}: ` +
        `Expected ${expectedArities
          .map(
            ([x, y]) =>
              `${x}${y === x ? "" : ".." + (y === Infinity ? "oo" : y)}`,
          )
          .join(", ")} but got ${args.length}.`,
      calleeIdent.source,
    );
  }

  if (arityMatchingOpCodes.length > 1) {
    // Hack! We temporarily assign the front name to the opCode field.
    // It will be resolved during typecheck.
    return op.unsafe(callee as OpCode)(...args);
  }

  return op.unsafe(arityMatchingOpCodes[0], true)(...args);
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
      return arrayType(args[0], lengthToArrayIndexType(Number(args[1].value)));
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

export function annotate(
  expr: Node,
  valueType: [any, Type] | null,
  targetType: [any, Text] | null,
): Node {
  if (valueType !== null) (expr as any).type = valueType[1];
  if (targetType !== null && !restrictedFrontend)
    (expr as any).targetType = targetType[1].value;
  return expr;
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

export interface ParseResult {
  node: Node;
  warnings: Error[];
}

export default function parse(
  code: string,
  restrictFrontend = true,
): ParseResult {
  warnings = [];
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
      let message =
        token === undefined
          ? "Unexpected character."
          : `Unexpected token ${JSON.stringify(token.text)}.`;
      if (expected.length > 0) {
        message += ` Expected one of ${expected.join(", ")}.`;
      }
      throw new PolygolfError(
        message,
        token === undefined
          ? undefined
          : {
              line: token.line,
              column: token.col,
            },
      );
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
  return {
    node: results[0] as Node,
    warnings,
  };
}

function toAssignment(opCode: OpCode, callee: string) {
  return {
    opCode,
    callee,
    asRhsOfAssignment: true,
  };
}

const deprecatedAliases: Record<
  string,
  | OpCode
  | {
      asRhsOfAssignment: boolean;
      opCode: OpCode;
      callee: string;
    }
> = {
  text_contains: "contains[Text]",
  array_contains: "contains[Array]",
  list_contains: "contains[List]",
  table_contains_key: "contains[Table]",
  set_contains: "contains[Set]",
  argv_get: "at[argv]",
  array_get: "at[Array]",
  list_get: "at[List]",
  table_get: "at[Table]",
  text_get_byte: "at[byte]",
  text_get_codepoint: "at[codepoint]",
  array_set: toAssignment("with_at[Array]", "@<-"),
  list_set: toAssignment("with_at[List]", "@<-"),
  table_set: toAssignment("with_at[Table]", "@<-"),
  "set_at[Array]": toAssignment("with_at[Array]", "@<-"),
  "set_at[List]": toAssignment("with_at[List]", "@<-"),
  "set_at_back[List]": toAssignment("with_at_back[List]", "@<-"),
  "set_at[Table]": toAssignment("with_at[Table]", "@<-"),
  set_at: toAssignment("@" as any, "@<-"),
  text_byte_find: "find[byte]",
  text_codepoint_find: "find[codepoint]",
  text_get_byte_to_int: "ord_at[byte]",
  text_get_codepoint_to_int: "ord_at[codepoint]",
  text_byte_to_int: "ord[byte]",
  codepoint_to_int: "ord[codepoint]",
  int_to_text_byte: "char[byte]",
  int_to_codepoint: "char[codepoint]",
  text_replace: "replace",
  text_split: "split",
  text_split_whitespace: "split_whitespace",
  println_int: "println[Int]",
  print_int: "print[Int]",
  concat: "concat[Text]",
  list_push: toAssignment("append", "..<-"),
  push: toAssignment("append", "..<-"),
  list_length: "size[List]",
  text_byte_reversed: "reversed[byte]",
  text_codepoint_reversed: "reversed[codepoint]",
  text_get_byte_slice: "slice[byte]",
  text_get_codepoint_slice: "slice[codepoint]",
  text_byte_length: "size[byte]",
  text_codepoint_length: "size[codepoint]",
  list_find: "find[List]",
  text_to_int: "dec_to_int",
  int_to_text: "int_to_dec",
};
