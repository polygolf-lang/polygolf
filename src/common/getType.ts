import {
  type Node,
  type Type,
  listType as list,
  arrayType as array,
  integerType as int,
  integerTypeIncludingAll,
  type IntegerType,
  type Op,
  isSubtype,
  union,
  toString,
  voidType,
  textType as text,
  type TextType,
  booleanType,
  type OpCode,
  setType as set,
  tableType as table,
  type KeyValueType,
  keyValueType,
  getArgs,
  functionType,
  type IntegerBound,
  max,
  min,
  add,
  mul,
  lt,
  floorDiv,
  truncDiv,
  sub,
  isFiniteBound,
  isFiniteType,
  abs,
  neg,
  typeContains,
  isConstantType,
  constantIntegerType,
  type ListType,
  isAssociative,
  op,
  leq,
  isIdent,
  typeArg,
  instantiateGenerics,
  type ArrayType,
  type TableType,
} from "../IR";
import { byteLength, charLength } from "./objective";
import { PolygolfError } from "./errors";
import { type Spine } from "./Spine";
import { getIdentifierType, isIdentifierReadonly } from "./symbols";

const cachedType = new WeakMap<Node, Type>();
const currentlyFinding = new WeakSet<Node>();
export function getType(expr: Node, context: Node | Spine): Type {
  const program = "kind" in context ? context : context.root.node;
  if (cachedType.has(expr)) return cachedType.get(expr)!;
  if (currentlyFinding.has(expr))
    throw new PolygolfError(`Node defined in terms of itself`, expr.source);

  currentlyFinding.add(expr);
  try {
    const t = calcType(expr, program);
    currentlyFinding.delete(expr);
    cachedType.set(expr, t);
    return t;
  } catch (e) {
    currentlyFinding.delete(expr);
    if (e instanceof Error && !(e instanceof PolygolfError)) {
      throw new PolygolfError(e.message, expr.source);
    }
    throw e;
  }
}

export function calcType(expr: Node, program: Node): Type {
  // user-annotated node
  if (expr.type !== undefined) return expr.type;
  // type inference
  const type = (e: Node) => getType(e, program);
  switch (expr.kind) {
    case "Function":
      return functionType(expr.args.map(type), type(expr.expr));
    case "Block":
    case "VarDeclaration":
      return voidType;
    case "Variants":
      return expr.variants.map(type).reduce(union);
    case "Assignment": {
      if (
        isIdent()(expr.variable) &&
        isIdentifierReadonly(expr.variable, program)
      ) {
        throw new PolygolfError(
          `Type error. Cannot assign to readonly identifier ${expr.variable.name}.`,
          expr.source,
        );
      }
      const a = type(expr.variable);
      const b = type(expr.expr);
      if (isSubtype(b, a)) {
        return b;
      }
      throw new Error(
        `Type error. Cannot assign ${toString(b)} to ${toString(a)}.`,
      );
    }
    case "IndexCall": {
      const a = type(expr.collection);
      const b = type(expr.index);
      let expectedIndex: Type;
      let result: Type;
      switch (a.kind) {
        case "Array":
          expectedIndex =
            expr.oneIndexed && a.length.kind === "integer"
              ? int(1, a.length.high + 1n)
              : a.length;
          result = a.member;
          break;
        case "List": {
          expectedIndex = int(expr.oneIndexed ? 1 : 0, "oo");
          result = a.member;
          break;
        }
        case "Table": {
          expectedIndex = a.key;
          result = a.value;
          break;
        }
        default:
          throw new Error(
            "Type error. IndexCall must be used on a collection.",
          );
      }
      if (isSubtype(b, expectedIndex)) {
        return result;
      }
      throw new Error(
        `Type error. Cannot index ${toString(a)} with ${toString(b)}.`,
      );
    }
    case "Op":
      return getOpCodeType(expr, program);
    case "MutatingInfix":
      return voidType;
    case "FunctionCall": {
      const fType = type(expr.func);
      if (fType.kind !== "Function") {
        throw new Error(`Type error. Type ${toString(fType)} is not callable.`);
      }
      if (expr.args.every((x, i) => isSubtype(type(x), fType.arguments[i]))) {
        return fType.result;
      }
      throw new Error(
        `Type error. Function expected [${fType.arguments
          .map(toString)
          .join(", ")}] but got [${expr.args
          .map((x) => toString(type(x)))
          .join(", ")}].`,
      );
    }
    case "Identifier":
      if (expr.builtin) throw Error("Cannot calculate type of builtin.");
      return getIdentifierType(expr, program);
    case "Text": {
      const codepoints = charLength(expr.value);
      return text(
        int(codepoints, codepoints),
        codepoints === byteLength(expr.value),
      );
    }
    case "Integer":
      return int(expr.value, expr.value);
    case "Array":
      return array(
        expr.exprs.map(type).reduce((a, b) => union(a, b)),
        expr.exprs.length,
      );
    case "List":
      return expr.exprs.length > 0
        ? list(expr.exprs.map(type).reduce((a, b) => union(a, b)))
        : list("void");
    case "Set":
      return expr.exprs.length > 0
        ? set(expr.exprs.map(type).reduce((a, b) => union(a, b)))
        : set("void");
    case "KeyValue": {
      const k = type(expr.key);
      const v = type(expr.value);
      if (k.kind === "integer" || k.kind === "text") return keyValueType(k, v);
      throw new Error(
        `Type error. Operator 'key_value' error. Expected [-oo..oo | Text, T1] but got [${toString(
          k,
        )}, ${toString(v)}].`,
      );
    }
    case "Table": {
      const types = expr.kvPairs.map(type);
      if (types.every((x) => x.kind === "KeyValue")) {
        const kvTypes = types as KeyValueType[];
        const kTypes = kvTypes.map((x) => x.key);
        const vTypes = kvTypes.map((x) => x.value);
        return expr.kvPairs.length > 0
          ? table(
              kTypes.reduce((a, b) => union(a, b) as any),
              vTypes.reduce((a, b) => union(a, b)),
            )
          : table(int(), "void");
      }
      throw new Error(
        "Programming error. Type of KeyValue nodes should always be KeyValue.",
      );
    }
    case "ConditionalOp": {
      const conditionType = type(expr.condition);
      if (isSubtype(conditionType, booleanType))
        return union(type(expr.consequent), type(expr.alternate));
      throw new Error(
        `Type error. Operator '${
          expr.isSafe ? "conditional" : "unsafe_conditional"
        }' error. Expected [Boolean, T1, T1] but got [${toString(
          conditionType,
        )}, ${toString(type(expr.condition))}, ${toString(
          type(expr.alternate),
        )}].`,
      );
    }
    case "ManyToManyAssignment":
      return voidType;
    case "Import":
      return voidType;
    case "OneToManyAssignment":
      return type(expr.expr);
    case "If":
    case "ForRange":
    case "While":
    case "ForArgv":
      return voidType;
    case "ImplicitConversion": {
      return type(op(expr.behavesLike, expr.expr));
    }
  }
  throw new Error(`Type error. Unexpected node ${expr.kind}.`);
}

function getTypeBitNot(t: IntegerType): IntegerType {
  return int(sub(-1n, t.high), sub(-1n, t.low));
}

type ExpectedTypes = { variadic: Type; min: number } | Type[];
function variadic(type: Type, min = 2): ExpectedTypes {
  return {
    variadic: type,
    min,
  };
}

function getOpCodeArgTypes(op: OpCode): ExpectedTypes {
  const T1 = typeArg("T1");
  const T2 = typeArg("T2");
  switch (op) {
    case "gcd":
      return [int(), int(1)];
    case "add":
    case "sub":
    case "mul":
    case "div":
    case "trunc_div":
    case "unsigned_trunc_div":
    case "pow":
    case "mod":
    case "rem":
    case "unsigned_rem":
    case "bit_and":
    case "bit_or":
    case "bit_xor":
    case "bit_shift_left":
    case "bit_shift_right":
    case "min":
    case "max":
      return isAssociative(op) ? variadic(int()) : [int(), int()];
    // (num, num) => bool
    case "lt":
    case "leq":
    case "eq":
    case "neq":
    case "geq":
    case "gt":
      return [int(), int()];
    // (bool, bool) => bool
    case "unsafe_or":
    case "unsafe_and":
    case "or":
    case "and":
      return variadic(booleanType);
    // membership
    case "array_contains":
      return [array(T1, T2), T1];
    case "list_contains":
      return [list(T1), T1];
    case "table_contains_key":
      return [table(T1, T2), T1];
    case "set_contains":
      return [set(T1), T1];
    // collection get
    case "array_get":
      return [array(T1, T2), T2];
    case "list_get":
      return [list(T1), int(0)];
    case "table_get":
      return [table(T1, T2), T1];
    case "argv_get":
      return [int(0)];
    // other
    case "list_push":
      return [list(T1), T1];
    case "list_find":
      return [list(T1), T1];
    case "concat":
      return variadic(text());
    case "repeat":
      return [text(), int(0)];
    case "text_contains":
    case "text_split":
      return [text(), text()];
    case "text_codepoint_find":
    case "text_byte_find":
      return [text(), text(int(1))];
    case "text_get_byte":
    case "text_get_codepoint":
    case "right_align":
      return [text(), int(0)];
    case "join":
      return [list(text()), text()];
    case "int_to_bin_aligned":
    case "int_to_hex_aligned":
      return [int(0), int(0)];
    case "simplify_fraction":
      return [int(0), int(0)];
    // unary
    case "abs":
    case "bit_not":
    case "neg":
      return [int()];
    case "not":
      return [booleanType];
    case "int_to_bool":
      return [int()];
    case "int_to_text":
      return [int()];
    case "int_to_bin":
    case "int_to_hex":
      return [int(0)];
    case "text_to_int":
      return [text(int(), true)];
    case "bool_to_int":
      return [booleanType];
    case "int_to_text_byte":
      return [int(0, 255)];
    case "int_to_codepoint":
      return [int(0, 0x10ffff)];
    case "list_length":
      return [list(T1)];
    case "text_byte_length":
    case "text_codepoint_length":
    case "text_split_whitespace":
      return [text()];
    case "sorted":
      return [list(T1)];
    case "text_byte_reversed":
    case "text_codepoint_reversed":
      return [text()];
    // other
    case "true":
    case "false":
    case "read_codepoint":
    case "read_byte":
    case "read_int":
    case "read_line":
    case "argc":
    case "argv":
      return [];
    case "putc":
      return [int(0, 255)];
    case "print":
    case "println":
      return [text()];
    case "print_int":
    case "println_int":
      return [int()];
    case "println_list_joined":
      return [list(text()), text()];
    case "println_many_joined":
      return variadic(text(), 2);
    case "text_replace":
      return [text(), text(int(1, "oo")), text()];
    case "text_multireplace":
      return variadic(text(), 2);
    case "text_get_byte_slice":
    case "text_get_codepoint_slice":
      return [text(), int(0), int(0)];
    case "text_get_codepoint_to_int":
      return [text(), int(0)];
    case "text_get_byte_to_int":
      return [text(), int(0)];
    case "codepoint_to_int":
    case "text_byte_to_int":
      return [text(int(1, 1))];
    case "array_set":
      return [array(T1, T2), T2, T1];
    case "list_set":
      return [list(T1), int(0), T1];
    case "table_set":
      return [table(T1, T2), T1, T2];
  }
}

export function getExampleOpCodeArgTypes(op: OpCode): Type[] {
  const type = getOpCodeArgTypes(op);
  if (Array.isArray(type)) {
    return type.map(instantiateGenerics({ T1: int(0, 100), T2: int(0, 100) }));
  }
  return Array(type.min).fill(type.variadic);
}

function expectedTypesToString(expectedTypes: ExpectedTypes): string {
  return Array.isArray(expectedTypes)
    ? `[${expectedTypes.map(toString).join(", ")}]`
    : `[...${toString(expectedTypes.variadic)}]`;
}

/**
 * Simple algorithm for validating types of arguments of ops. Type vars are only bound by being used as an arg to a List, Array, Set or Table at a top level.
 * TODO: More general unifying algo.
 * @param gotTypes List of actual types provided.
 * @param expectedTypes Expected types (array of types or variadic object).
 * @returns True iff it is a match.
 */
function isTypeMatch(gotTypes: Type[], expectedTypes: ExpectedTypes) {
  if (Array.isArray(expectedTypes)) {
    if (expectedTypes.length !== gotTypes.length) return false;
    const params: Record<string, Type> = {};
    const instantiate = instantiateGenerics(params);
    let i = 0;
    for (let exp of expectedTypes) {
      const got = instantiate(gotTypes[i]);
      exp = instantiate(exp);
      if (exp.kind === "List" && got.kind === "List") {
        if (exp.member.kind === "TypeArg" && !(exp.member.name in params)) {
          params[exp.member.name] = got.member;
          exp = { ...exp, member: got.member };
        }
      } else if (exp.kind === "Array" && got.kind === "Array") {
        if (exp.member.kind === "TypeArg" && !(exp.member.name in params)) {
          params[exp.member.name] = got.member;
          exp = { ...exp, member: got.member };
        }
        if (exp.length.kind === "TypeArg" && !(exp.length.name in params)) {
          params[exp.length.name] = got.length;
          exp = { ...exp, length: got.length };
        }
      } else if (exp.kind === "Set" && got.kind === "Set") {
        if (exp.member.kind === "TypeArg" && !(exp.member.name in params)) {
          params[exp.member.name] = got.member;
          exp = { ...exp, member: got.member };
        }
      } else if (exp.kind === "Table" && got.kind === "Table") {
        if (exp.key.kind === "TypeArg" && !(exp.key.name in params)) {
          params[exp.key.name] = got.key;
          exp = { ...exp, key: got.key };
        }
        if (exp.value.kind === "TypeArg" && !(exp.value.name in params)) {
          params[exp.value.name] = got.value;
          exp = { ...exp, value: got.value };
        }
      }
      if (!isSubtype(got, exp)) return false;
      i++;
    }
    return true;
  }
  return (
    gotTypes.length >= expectedTypes.min &&
    gotTypes.every((x) => isSubtype(x, expectedTypes.variadic))
  );
}

function getOpCodeType(expr: Op, program: Node): Type {
  const got = getArgs(expr).map((x) => getType(x, program));
  const expected = getOpCodeArgTypes(expr.op);

  if (!isTypeMatch(got, expected)) {
    throw new Error(
      `Type error. Operator '${
        expr.op
      }' type error. Expected ${expectedTypesToString(expected)} but got [${got
        .map(toString)
        .join(", ")}].`,
    );
  }

  switch (expr.op) {
    // binary
    // (num, num) => num
    case "gcd": {
      const [a, b] = got as [IntegerType, IntegerType];
      return int(
        1n,
        min(max(abs(a.low), abs(a.high)), max(abs(b.low), abs(b.high))),
      );
    }
    case "add":
    case "sub":
    case "mul":
    case "div":
    case "trunc_div":
    case "unsigned_trunc_div":
    case "pow":
    case "mod":
    case "rem":
    case "unsigned_rem":
    case "bit_and":
    case "bit_or":
    case "bit_xor":
    case "bit_shift_left":
    case "bit_shift_right":
    case "min":
    case "max":
      return got.reduce((a, b) =>
        getArithmeticType(expr.op, a as IntegerType, b as IntegerType),
      );
    // (num, num) => bool
    case "lt":
    case "leq":
    case "eq":
    case "neq":
    case "geq":
    case "gt":
      return booleanType;
    // (bool, bool) => bool
    case "unsafe_or":
    case "unsafe_and":
    case "or":
    case "and":
      return booleanType;
    // membership
    case "array_contains":
    case "list_contains":
    case "table_contains_key":
    case "set_contains":
      return booleanType;
    // collection get
    case "array_get":
      return (got[0] as ArrayType).member;
    case "list_get":
      return (got[0] as ListType).member;
    case "table_get":
      return (got[0] as TableType).value;
    case "argv_get":
      return text();
    // other
    case "list_push":
      return voidType;
    case "list_find":
      return int(-1, (1n << 31n) - 1n);
    case "concat": {
      const textTypes = got as TextType[];
      return text(
        textTypes
          .map((x) => x.codepointLength)
          .reduce((a, b) => getArithmeticType("add", a, b)),
        textTypes.every((x) => x.isAscii),
      );
    }
    case "repeat": {
      const [t, i] = got as [TextType, IntegerType];
      return text(getArithmeticType("mul", t.codepointLength, i), t.isAscii);
    }
    case "text_contains":
      return booleanType;
    case "text_codepoint_find":
    case "text_byte_find":
      return int(
        -1,
        sub(
          mul(
            (got[0] as TextType).codepointLength.high,
            expr.op === "text_byte_find" && !(got[0] as TextType).isAscii
              ? 4n
              : 1n,
          ),
          (got[1] as TextType).codepointLength.low,
        ),
      );
    case "text_split":
      return list(got[0]);
    case "text_get_byte":
    case "text_get_codepoint":
      return text(int(1, 1), (got[0] as TextType).isAscii);
    case "join":
      return text(
        int(0, "oo"),
        ((got[0] as ListType).member as TextType).isAscii &&
          (got[1] as TextType).isAscii,
      );
    case "right_align":
      return text(int(0, "oo"), (got[0] as TextType).isAscii);
    case "int_to_bin_aligned":
    case "int_to_hex_aligned": {
      const t1 = got[0] as IntegerType;
      const t2 = got[1] as IntegerType;
      if (isFiniteType(t1) && isFiniteType(t2)) {
        return text(
          integerTypeIncludingAll(
            BigInt(
              t1.high.toString(expr.op === "int_to_bin_aligned" ? 2 : 16)
                .length,
            ),
            t2.high,
          ),
          true,
        );
      }
      return text(int(), true);
    }
    case "simplify_fraction": {
      const t1 = got[0] as IntegerType;
      const t2 = got[1] as IntegerType;
      if (isFiniteType(t1) && isFiniteType(t2))
        return text(
          int(
            0,
            1 +
              Math.max(t1.low.toString().length, t1.high.toString().length) +
              Math.max(t2.low.toString().length, t2.high.toString().length),
          ),
          true,
        );
      return text();
    }
    // unary
    case "abs": {
      const t = got[0] as IntegerType;
      if (lt(t.low, 0n) && lt(0n, t.high))
        return int(0, max(neg(t.low), t.high));
      return int(min(abs(t.low), abs(t.high)), max(abs(t.low), abs(t.high)));
    }
    case "bit_not": {
      const t = got[0] as IntegerType;
      return getTypeBitNot(t);
    }
    case "neg": {
      const t = got[0] as IntegerType;
      return int(neg(t.high), neg(t.low));
    }
    case "not":
      return booleanType;
    case "int_to_bool":
      return booleanType;
    case "int_to_text":
    case "int_to_bin":
    case "int_to_hex": {
      const t = got[0] as IntegerType;
      if (isFiniteType(t))
        return text(
          integerTypeIncludingAll(
            ...[t.low, t.high, ...(typeContains(t, 0n) ? [0n] : [])].map((x) =>
              BigInt(
                x.toString(
                  expr.op === "int_to_bin"
                    ? 2
                    : expr.op === "int_to_hex"
                    ? 16
                    : 10,
                ).length,
              ),
            ),
          ),
          true,
        );
      return text(int(1), true);
    }
    case "text_to_int": {
      const t = got[0] as TextType;
      if (!isFiniteType(t.codepointLength)) return int();
      return int(
        1n - 10n ** (t.codepointLength.high - 1n),
        10n ** t.codepointLength.high - 1n,
      );
    }
    case "bool_to_int":
      return int(0, 1);
    case "int_to_text_byte":
      return text(int(1n, 1n), lt((got[0] as IntegerType).high, 128n));
    case "int_to_codepoint":
      return text(int(1n, 1n), lt((got[0] as IntegerType).high, 128n));
    case "list_length":
      return int(0, (1n << 31n) - 1n);
    case "text_byte_length": {
      const codepointLength = (got[0] as TextType).codepointLength;
      return int(
        codepointLength.low,
        min(
          1n << 31n,
          mul(codepointLength.high, (got[0] as TextType).isAscii ? 1n : 4n),
        ),
      );
    }
    case "text_codepoint_length":
      return (got[0] as TextType).codepointLength;
    case "text_split_whitespace":
      return list(got[0]);
    case "sorted":
      return got[0];
    case "text_byte_reversed":
    case "text_codepoint_reversed":
      return got[0];
    // other
    case "true":
    case "false":
      return booleanType;
    case "read_codepoint":
      return text(int(1, 1));
    case "read_byte":
      return text(int(1, 1));
    case "read_int":
      return int();
    case "read_line":
      return text();
    case "argc":
      return int(0, 2 ** 31 - 1);
    case "argv":
      return list(text());
    case "putc":
      return voidType;
    case "print":
    case "println":
      return voidType;
    case "print_int":
    case "println_int":
      return voidType;
    case "println_list_joined":
      return voidType;
    case "println_many_joined":
      return voidType;
    case "text_replace": {
      const [a, c] = [got[0], got[2]] as TextType[];
      return text(
        getArithmeticType("mul", a.codepointLength, c.codepointLength),
        a.isAscii && c.isAscii,
      );
    }
    case "text_multireplace":
      return text();
    case "text_get_byte_slice":
    case "text_get_codepoint_slice": {
      const [t, i1, i2] = got as [TextType, IntegerType, IntegerType];
      const maximum = min(
        t.codepointLength.high,
        max(0n, sub(i2.high, i1.low)),
      );
      return text(int(0n, maximum), t.isAscii);
    }
    case "text_get_codepoint_to_int":
      return int(0, (got[0] as TextType).isAscii ? 127 : 0x10ffff);
    case "text_get_byte_to_int":
      return int(0, (got[0] as TextType).isAscii ? 127 : 255);
    case "codepoint_to_int":
      return int(0, (got[0] as TextType).isAscii ? 127 : 0x10ffff);
    case "text_byte_to_int":
      return int(0, (got[0] as TextType).isAscii ? 127 : 255);
    case "array_set":
    case "list_set":
    case "table_set":
      return voidType;
  }
}

export function getArithmeticType(
  op: OpCode,
  a: IntegerType, // left argument
  b: IntegerType, // right argument
): IntegerType {
  switch (op) {
    case "min":
      return int(min(a.low, b.low), min(a.high, b.high));
    case "max":
      return int(max(a.low, b.low), max(a.high, b.high));
    case "add":
      return int(add(a.low, b.low), add(a.high, b.high));
    case "sub":
      return int(sub(a.low, b.high), sub(a.high, b.low));
    case "mul": {
      // Extreme values of a product arise from multiplying the extremes of the inputs.
      // The single case were simple multiplication of the bounds is not defined, corresponds to multiplying
      // zero by an unbounded value which always results in zero.
      const M = (x: IntegerBound, y: IntegerBound) => {
        try {
          return mul(x, y);
        } catch {
          return 0n;
        }
      };
      return integerTypeIncludingAll(
        M(a.low, b.low),
        M(a.low, b.high),
        M(a.high, b.low),
        M(a.high, b.high),
      );
    }
    case "div": {
      const values: IntegerBound[] = [];
      if (lt(b.low, 0n)) {
        values.push(
          floorDiv(a.low, min(-1n, b.high)),
          floorDiv(a.high, min(-1n, b.high)),
        );
      }
      if (lt(0n, b.high)) {
        values.push(
          floorDiv(a.low, max(1n, b.low)),
          floorDiv(a.high, max(1n, b.low)),
        );
      }
      if (
        (b.low === "-oo" && lt(a.low, 0n)) ||
        (b.high === "oo" && lt(0n, a.high))
      )
        values.push(0n);
      else if (
        (b.low === "-oo" && lt(0n, a.high)) ||
        (b.high === "oo" && lt(a.low, 0n))
      )
        values.push(-1n);
      else {
        if (b.low !== 0n)
          values.push(floorDiv(a.low, b.low), floorDiv(a.high, b.low));
        if (b.high !== 0n)
          values.push(floorDiv(a.low, b.high), floorDiv(a.high, b.high));
      }
      return integerTypeIncludingAll(...values);
    }
    case "trunc_div": {
      const values: IntegerBound[] = [];
      if (lt(b.low, 0n)) {
        values.push(
          truncDiv(a.low, min(-1n, b.high)),
          truncDiv(a.high, min(-1n, b.high)),
        );
      }
      if (lt(0n, b.high)) {
        values.push(
          truncDiv(a.low, max(1n, b.low)),
          truncDiv(a.high, max(1n, b.low)),
        );
      }
      if (b.low === "-oo" || b.high === "oo") values.push(0n);
      else if (b.low !== 0n && isFiniteBound(b.low))
        values.push(truncDiv(a.low, b.low), truncDiv(a.high, b.low));
      if (b.high !== 0n && isFiniteBound(b.high))
        values.push(truncDiv(a.low, b.high), truncDiv(a.high, b.high));

      return integerTypeIncludingAll(...values);
    }
    case "mod":
      return getIntegerTypeMod(a, b);
    case "rem":
      return getIntegerTypeRem(a, b);
    case "unsigned_rem":
    case "unsigned_trunc_div":
      if (leq(0n, a.low) && leq(0n, b.low)) {
        return getArithmeticType(
          op === "unsigned_rem" ? "rem" : "trunc_div",
          a,
          b,
        );
      }
      return int();
    case "pow": {
      if (lt(b.low, 0n))
        throw new Error(
          `Type error. Operator 'pow' expected [-oo..oo, 0..oo] but got ` +
            `[${toString(a)}, ${toString(b)}].`,
        );
      const values: IntegerBound[] = [];

      // For unbounded b, the result must contain the following values:
      if (b.high === "oo") {
        if (typeContains(a, -1n)) values.push(-1n, 1n);
        if (typeContains(a, 0n)) values.push(0n);
        if (typeContains(a, 1n)) values.push(1n);
        if (lt(a.low, -1n)) values.push("-oo", "oo");
        else if (lt(1n, a.high)) {
          values.push("oo");
          values.push((a.low as bigint) ** (b.low as bigint));
        }
      } else if (isFiniteType(b)) {
        // Unbounded a results in unbounded output, unless b is known to be 0.
        if (a.high === "oo") values.push(b.high === 0n ? 1n : "oo");
        // For finite bounds, the extreme might lie at the power of the extremes.
        if (isFiniteBound(a.low)) values.push(a.low ** b.low);
        if (isFiniteBound(a.low)) values.push(a.low ** b.high);
        if (isFiniteBound(a.high)) values.push(a.high ** b.low);
        if (isFiniteBound(a.high)) values.push(a.high ** b.high);
        if (b.low !== b.high) {
          // The parity of b might switch the sign
          // meaning the extreme might arise from multiplying by b that is one away from the extreme
          if (isFiniteBound(a.low)) values.push(a.low ** (b.low + 1n));
          if (isFiniteBound(a.low)) values.push(a.low ** (b.high - 1n));
          if (isFiniteBound(a.high)) values.push(a.high ** (b.low + 1n));
          if (isFiniteBound(a.high)) values.push(a.high ** (b.high - 1n));
          // Negative unbounded a results in an unbounded output in both directions,
          // unless b is known to be 0.
          if (a.low === "-oo")
            values.push(
              ...(b.high === 0n ? [1n] : (["-oo", "oo"] as IntegerBound[])),
            );
        } else {
          // If the parity of b is fixed, negative unbounded a results
          // in an unbounded output in a single direction
          if (a.low === "-oo") {
            if (b.low % 2n === 1n) {
              values.push(b.high === 0n ? 1n : "-oo");
              values.push(isFiniteBound(a.high) ? a.high ** b.low : "oo");
            } else {
              values.push(b.high === 0n ? 1n : "oo");
              values.push(lt(a.high, 0n) ? (a.high as bigint) ** b.low : 0n);
            }
          }
        }
      }

      return integerTypeIncludingAll(...values);
    }
    case "bit_and":
      return getTypeBitNot(
        getArithmeticType("bit_or", getTypeBitNot(a), getTypeBitNot(b)),
      );
    case "bit_shift_left":
      return getArithmeticType(
        "mul",
        a,
        getArithmeticType("pow", int(2, 2), b),
      );
    case "bit_shift_right":
      return getArithmeticType(
        "div",
        a,
        getArithmeticType("pow", int(2, 2), b),
      );
    case "bit_or":
    case "bit_xor": {
      const left = max(abs(a.low), abs(a.high));
      const right = max(abs(b.low), abs(b.high));
      if (isFiniteBound(left) && isFiniteBound(right)) {
        const larger = lt(left, right) ? left : right;
        const lim = 2n ** BigInt(larger.toString(2).length);
        if (lt(-1n, a.low) && lt(-1n, b.low)) return int(0n, lim);
        return int(neg(lim), lim);
      }
      return int();
    }
  }
  throw new Error(`Type error. Unknown opcode. ${op ?? "null"}`);
}

export function getCollectionTypes(expr: Node, program: Node): Type[] {
  const exprType = getType(expr, program);
  switch (exprType.kind) {
    case "Array":
    case "List":
    case "Set":
      return [exprType.member];
    case "Table":
      return [exprType.key, exprType.value];
    case "text":
      return [text(int(1, 1), exprType.isAscii)];
  }
  throw new Error("Type error. Node is not a collection.");
}

function getIntegerTypeMod(a: IntegerType, b: IntegerType): IntegerType {
  if (isConstantType(a) && isConstantType(b)) {
    return constantIntegerType(
      a.low - b.low * (floorDiv(a.low, b.low) as bigint),
    );
  }
  const values: IntegerBound[] = [];
  if (lt(b.low, 0n)) values.push(sub(b.low, -1n));
  if (lt(0n, b.high)) values.push(sub(b.high, 1n));
  values.push(0n);
  return integerTypeIncludingAll(...values);
}

function getIntegerTypeRem(a: IntegerType, b: IntegerType): IntegerType {
  if (isConstantType(a) && isConstantType(b)) {
    return constantIntegerType(a.low % b.low);
  }
  const m = max(abs(b.low), abs(b.high));
  return int(lt(a.low, 0n) ? neg(m) : 0n, m);
}
