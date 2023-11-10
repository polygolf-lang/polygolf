import {
  type Node,
  type Type,
  listType,
  arrayType,
  integerType,
  integerTypeIncludingAll,
  type IntegerType,
  type Op,
  isSubtype,
  union,
  toString,
  voidType,
  textType,
  type TextType,
  booleanType,
  type OpCode,
  setType,
  tableType,
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
          expectedIndex = expr.oneIndexed
            ? integerType(1, a.length)
            : integerType(0, a.length - 1);
          result = a.member;
          break;
        case "List": {
          expectedIndex = integerType(expr.oneIndexed ? 1 : 0, "oo");
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
      return getIdentifierType(expr, program);
    case "Text": {
      const codepoints = charLength(expr.value);
      return textType(
        integerType(codepoints, codepoints),
        codepoints === byteLength(expr.value),
      );
    }
    case "Integer":
      return integerType(expr.value, expr.value);
    case "Array":
      return arrayType(
        expr.exprs.map(type).reduce((a, b) => union(a, b)),
        expr.exprs.length,
      );
    case "List":
      return expr.exprs.length > 0
        ? listType(expr.exprs.map(type).reduce((a, b) => union(a, b)))
        : listType("void");
    case "Set":
      return expr.exprs.length > 0
        ? setType(expr.exprs.map(type).reduce((a, b) => union(a, b)))
        : setType("void");
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
          ? tableType(
              kTypes.reduce((a, b) => union(a, b) as any),
              vTypes.reduce((a, b) => union(a, b)),
            )
          : tableType(integerType(), "void");
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
  return integerType(sub(-1n, t.high), sub(-1n, t.low));
}

function getOpCodeType(expr: Op, program: Node): Type {
  const types = getArgs(expr).map((x) => getType(x, program));
  function expectVariadicType(
    expected: Type,
    minArityOrArityCheck: number | ((x: number) => boolean) = 2,
  ) {
    const arityCheck =
      typeof minArityOrArityCheck === "number"
        ? (x: number) => x >= minArityOrArityCheck
        : minArityOrArityCheck;
    if (
      !arityCheck(types.length) ||
      types.some((x, i) => !isSubtype(x, expected))
    ) {
      throw new Error(
        `Type error. Operator '${
          expr.op ?? "null"
        }' type error. Expected [...${toString(expected)}] but got [${types
          .map(toString)
          .join(", ")}].`,
      );
    }
  }
  function expectType(...expected: Type[]) {
    if (
      types.length !== expected.length ||
      types.some((x, i) => !isSubtype(x, expected[i]))
    ) {
      throw new Error(
        `Type error. Operator '${
          expr.op ?? "null"
        }' type error. Expected [${expected
          .map(toString)
          .join(", ")}] but got [${types.map(toString).join(", ")}].`,
      );
    }
  }
  function expectGenericType(
    ...expected: (
      | "Set"
      | "Array"
      | "List"
      | "Table"
      | [string, (typeArgs: Type[]) => Type]
    )[]
  ): Type[] {
    function _throw() {
      let i = 1;
      const expectedS = expected.map((e) => {
        switch (e) {
          case "List":
          case "Set":
            return `(${e} T${i++})`;
          case "Array":
          case "Table":
            return `(${e} T${i++} T${i++})`;
        }
        return e[0];
      });
      throw new Error(
        `Type error. Operator '${
          expr.op ?? "null"
        }' type error. Expected [${expectedS.join(", ")}] but got [${types
          .map(toString)
          .join(", ")}].`,
      );
    }
    if (types.length !== expected.length) _throw();
    const typeArgs: Type[] = [];
    for (let i = 0; i < types.length; i++) {
      const exp = expected[i];
      const got = types[i];
      if (typeof exp === "string") {
        if (exp === "List" && got.kind === "List") {
          typeArgs.push(got.member);
        } else if (exp === "Array" && got.kind === "Array") {
          typeArgs.push(got.member);
          typeArgs.push(integerType(0, got.length - 1));
        } else if (exp === "Set" && got.kind === "Set") {
          typeArgs.push(got.member);
        } else if (exp === "Table" && got.kind === "Table") {
          typeArgs.push(got.key);
          typeArgs.push(got.value);
        } else {
          _throw();
        }
      }
    }
    for (let i = 0; i < types.length; i++) {
      const exp = expected[i];
      const got = types[i];
      if (typeof exp !== "string") {
        const expInstantiated = exp[1](typeArgs);
        if (!isSubtype(got, expInstantiated)) _throw();
      }
    }
    return typeArgs;
  }

  switch (expr.op) {
    // binary
    // (num, num) => num
    case "gcd": {
      expectType(integerType(), integerType(1));
      const [a, b] = types as [IntegerType, IntegerType];
      return integerType(
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
    case "max": {
      const op = expr.op;
      if (isAssociative(op)) {
        expectVariadicType(integerType());
      } else {
        expectType(integerType(), integerType());
      }
      return types.reduce((a, b) =>
        getArithmeticType(op, a as IntegerType, b as IntegerType),
      );
    }
    // (num, num) => bool
    case "lt":
    case "leq":
    case "eq":
    case "neq":
    case "geq":
    case "gt":
      expectType(integerType(), integerType());
      return booleanType;
    // (bool, bool) => bool
    case "unsafe_or":
    case "unsafe_and":
      return booleanType;
    case "or":
    case "and":
      expectVariadicType(booleanType);
      return booleanType;
    // membership
    case "array_contains":
      expectGenericType("Array", ["T1", (x) => x[0]]);
      return booleanType;
    case "list_contains":
      expectGenericType("List", ["T1", (x) => x[0]]);
      return booleanType;
    case "table_contains_key":
      expectGenericType("Table", ["T1", (x) => x[0]]);
      return booleanType;
    case "set_contains":
      expectGenericType("Set", ["T1", (x) => x[0]]);
      return booleanType;
    // collection get
    case "array_get":
      return expectGenericType("Array", ["T2", (x) => x[1]])[0];
    case "list_get":
      return expectGenericType("List", ["0..oo", () => integerType(0)])[0];
    case "table_get":
      return expectGenericType("Table", ["T1", (x) => x[0]])[1];
    case "argv_get":
      expectType(integerType(0));
      return textType();
    // other
    case "list_push":
      return expectGenericType("List", ["T1", (x) => x[0]])[0];
    case "list_find":
      expectGenericType("List", ["T1", (x) => x[0]]);
      return integerType(-1, (1n << 31n) - 1n);
    case "concat": {
      expectVariadicType(textType());
      const textTypes = types as TextType[];
      return textType(
        textTypes
          .map((x) => x.codepointLength)
          .reduce((a, b) => getArithmeticType("add", a, b)),
        textTypes.every((x) => x.isAscii),
      );
    }
    case "repeat": {
      expectType(textType(), integerType(0));
      const [t, i] = types as [TextType, IntegerType];
      return textType(
        getArithmeticType("mul", t.codepointLength, i),
        t.isAscii,
      );
    }
    case "text_contains":
      expectType(textType(), textType());
      return booleanType;
    case "text_codepoint_find":
    case "text_byte_find":
      expectType(textType(), textType(integerType(1, "oo")));
      return integerType(
        -1,
        sub(
          mul(
            (types[0] as TextType).codepointLength.high,
            expr.op === "text_byte_find" && !(types[0] as TextType).isAscii
              ? 4n
              : 1n,
          ),
          (types[1] as TextType).codepointLength.low,
        ),
      );
    case "text_split":
      expectType(textType(), textType());
      return listType(types[0]);
    case "text_get_byte":
    case "text_get_codepoint":
      expectType(textType(), integerType(0));
      return textType(integerType(1, 1), (types[0] as TextType).isAscii);
    case "join":
      expectType(listType(textType()), textType());
      return textType(
        integerType(0, "oo"),
        ((types[0] as ListType).member as TextType).isAscii &&
          (types[1] as TextType).isAscii,
      );
    case "right_align":
      expectType(textType(), integerType(0));
      return textType(integerType(0, "oo"), (types[0] as TextType).isAscii);
    case "int_to_bin_aligned":
    case "int_to_hex_aligned": {
      expectType(integerType(0), integerType(0));
      const t1 = types[0] as IntegerType;
      const t2 = types[0] as IntegerType;
      if (isFiniteType(t1) && isFiniteType(t2)) {
        return textType(
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
      return textType(integerType(), true);
    }
    case "simplify_fraction": {
      expectType(integerType(), integerType());
      const t1 = types[0] as IntegerType;
      const t2 = types[1] as IntegerType;
      if (isFiniteType(t1) && isFiniteType(t2))
        return textType(
          integerType(
            0,
            1 +
              Math.max(t1.low.toString().length, t1.high.toString().length) +
              Math.max(t2.low.toString().length, t2.high.toString().length),
          ),
          true,
        );
      return textType();
    }
    // unary
    case "abs": {
      expectType(integerType());
      const t = types[0] as IntegerType;
      if (lt(t.low, 0n) && lt(0n, t.high))
        return integerType(0, max(neg(t.low), t.high));
      return integerType(
        min(abs(t.low), abs(t.high)),
        max(abs(t.low), abs(t.high)),
      );
    }
    case "bit_not": {
      expectType(integerType());
      const t = types[0] as IntegerType;
      return getTypeBitNot(t);
    }
    case "neg": {
      expectType(integerType());
      const t = types[0] as IntegerType;
      return integerType(neg(t.high), neg(t.low));
    }
    case "not":
      expectType(booleanType);
      return booleanType;
    case "int_to_bool":
      expectType(integerType());
      return booleanType;
    case "int_to_text":
    case "int_to_bin":
    case "int_to_hex": {
      expectType(integerType(expr.op === "int_to_text" ? "-oo" : 0));
      const t = types[0] as IntegerType;
      if (isFiniteType(t))
        return textType(
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
      return textType(integerType(1), true);
    }
    case "text_to_int": {
      expectType(textType(integerType(), true));
      const t = types[0] as TextType;
      if (!isFiniteType(t.codepointLength)) return integerType();
      return integerType(
        1n - 10n ** (t.codepointLength.high - 1n),
        10n ** t.codepointLength.high - 1n,
      );
    }
    case "bool_to_int":
      expectType(booleanType);
      return integerType(0, 1);
    case "int_to_text_byte":
      expectType(integerType(0, 255));
      return textType(
        integerType(1n, 1n),
        lt((types[0] as IntegerType).high, 128n),
      );
    case "int_to_codepoint":
      expectType(integerType(0, 0x10ffff));
      return textType(
        integerType(1n, 1n),
        lt((types[0] as IntegerType).high, 128n),
      );
    case "list_length":
      expectGenericType("List");
      return integerType(0, (1n << 31n) - 1n);
    case "text_byte_length": {
      expectType(textType());
      const codepointLength = (types[0] as TextType).codepointLength;
      return integerType(
        codepointLength.low,
        min(
          1n << 31n,
          mul(codepointLength.high, (types[0] as TextType).isAscii ? 1n : 4n),
        ),
      );
    }
    case "text_codepoint_length":
      expectType(textType());
      return (types[0] as TextType).codepointLength;
    case "text_split_whitespace":
      expectType(textType());
      return listType(types[0]);
    case "sorted":
      return listType(expectGenericType("List")[0]);
    case "text_byte_reversed":
    case "text_codepoint_reversed":
      expectType(textType());
      return types[0];
    // other
    case "true":
    case "false":
      expectType();
      return booleanType;
    case "read_codepoint":
      return textType(integerType(1, 1));
    case "read_byte":
      return textType(integerType(1, 1));
    case "read_int":
      return integerType();
    case "read_line":
      return textType();
    case "argc":
      expectType();
      return integerType(0, 2 ** 31 - 1);
    case "argv":
      expectType();
      return listType(textType());
    case "putc":
      expectType(integerType(0, 255));
      return voidType;
    case "print":
    case "println":
      expectType(textType());
      return voidType;
    case "print_int":
    case "println_int":
      expectType(integerType());
      return voidType;
    case "println_list_joined":
      expectType(listType(textType()), textType());
      return voidType;
    case "println_many_joined":
      expectVariadicType(textType(), 1);
      return voidType;
    case "text_replace": {
      expectType(textType(), textType(integerType(1, "oo")), textType());
      const [a, c] = [types[0], types[2]] as TextType[];
      return textType(
        getArithmeticType("mul", a.codepointLength, c.codepointLength),
        a.isAscii && c.isAscii,
      );
    }
    case "text_multireplace":
      expectVariadicType(textType(), (x) => x > 2 && x % 2 > 0);
      return textType();
    case "text_get_byte_slice":
    case "text_get_codepoint_slice": {
      expectType(textType(), integerType(0), integerType(0));
      const [t, i1, i2] = types as [TextType, IntegerType, IntegerType];
      const maximum = min(
        t.codepointLength.high,
        max(0n, sub(i2.high, i1.low)),
      );
      return textType(integerType(0n, maximum), t.isAscii);
    }
    case "text_get_codepoint_to_int":
      expectType(textType(), integerType(0));
      return integerType(0, (types[0] as TextType).isAscii ? 127 : 0x10ffff);
    case "text_get_byte_to_int":
      expectType(textType(), integerType(0));
      return integerType(0, (types[0] as TextType).isAscii ? 127 : 255);
    case "codepoint_to_int":
      expectType(textType(integerType(1, 1)));
      return integerType(0, (types[0] as TextType).isAscii ? 127 : 0x10ffff);
    case "text_byte_to_int":
      expectType(textType(integerType(1, 1)));
      return integerType(0, (types[0] as TextType).isAscii ? 127 : 255);
    case "array_set":
      return expectGenericType(
        "Array",
        ["T2", (x) => x[1]],
        ["T1", (x) => x[0]],
      )[0];
    case "list_set":
      return expectGenericType(
        "List",
        ["0..oo", () => integerType(0)],
        ["T1", (x) => x[0]],
      )[0];
    case "table_set":
      return expectGenericType(
        "Table",
        ["T1", (x) => x[0]],
        ["T2", (x) => x[1]],
      )[1];
    case null:
      throw new Error(
        "Cannot determine type based on null opcode - this is most likely a programming error - a plugin introduced a node missing both an opcode and a type annotation.",
      );
  }
}

export function getArithmeticType(
  op: OpCode,
  a: IntegerType, // left argument
  b: IntegerType, // right argument
): IntegerType {
  switch (op) {
    case "min":
      return integerType(min(a.low, b.low), min(a.high, b.high));
    case "max":
      return integerType(max(a.low, b.low), max(a.high, b.high));
    case "add":
      return integerType(add(a.low, b.low), add(a.high, b.high));
    case "sub":
      return integerType(sub(a.low, b.high), sub(a.high, b.low));
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
      return integerType();
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
        getArithmeticType("pow", integerType(2, 2), b),
      );
    case "bit_shift_right":
      return getArithmeticType(
        "div",
        a,
        getArithmeticType("pow", integerType(2, 2), b),
      );
    case "bit_or":
    case "bit_xor": {
      const left = max(abs(a.low), abs(a.high));
      const right = max(abs(b.low), abs(b.high));
      if (isFiniteBound(left) && isFiniteBound(right)) {
        const larger = lt(left, right) ? left : right;
        const lim = 2n ** BigInt(larger.toString(2).length);
        if (lt(-1n, a.low) && lt(-1n, b.low)) return integerType(0n, lim);
        return integerType(neg(lim), lim);
      }
      return integerType();
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
      return [textType(integerType(1, 1), exprType.isAscii)];
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
  return integerType(lt(a.low, 0n) ? neg(m) : 0n, m);
}
