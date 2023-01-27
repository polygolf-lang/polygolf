import {
  Program,
  Expr,
  Type,
  listType,
  arrayType,
  BinaryOp,
  UnaryOp,
  FunctionCall,
  MethodCall,
  integerType,
  integerTypeIncludingAll,
  IntegerType,
  PolygolfOp,
  isSubtype,
  union,
  MutatingBinaryOp,
  toString,
  voidType,
  textType,
  TextType,
  booleanType,
  OpCode,
  SourcePointer,
  setType,
  tableType,
  KeyValueType,
  keyValueType,
  getArgs,
  functionType,
  IntegerBound,
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
  ListType,
} from "../IR";
import { byteLength, charLength } from "./applyLanguage";
import { PolygolfError } from "./errors";
import { getIdentifierType } from "./symbols";

const cachedType = new WeakMap<Expr, Type>();
const currentlyFinding = new WeakSet<Expr>();
export function getType(expr: Expr, program: Program): Type {
  if (cachedType.has(expr)) return cachedType.get(expr)!;
  if (currentlyFinding.has(expr))
    throw new PolygolfError(
      `Expression defined in terms of itself`,
      expr.source
    );
  currentlyFinding.add(expr);
  const t = calcType(expr, program);
  currentlyFinding.delete(expr);
  cachedType.set(expr, t);
  return t;
}

export function calcType(expr: Expr, program: Program): Type {
  // user-annotated node
  if (expr.type !== undefined) return expr.type;
  // type inference
  const type = (e: Expr) => getType(e, program);
  switch (expr.kind) {
    case "Function":
      return functionType(expr.args.map(type), type(expr.expr));
    case "Block":
    case "VarDeclaration":
      return voidType;
    case "Variants":
      return expr.variants.map(type).reduce(union);
    case "Assignment": {
      const a = type(expr.variable);
      const b = type(expr.expr);
      if (isSubtype(b, a)) {
        return b;
      }
      throw new PolygolfError(
        `Type error. Cannot assign ${toString(b)} to ${toString(a)}.`,
        expr.source
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
          throw new PolygolfError(
            "Type error. IndexCall must be used on a collection.",
            expr.source
          );
      }
      if (isSubtype(b, expectedIndex)) {
        return result;
      }
      throw new PolygolfError(
        `Type error. Cannot index ${toString(a)} with ${toString(b)}.`,
        expr.source
      );
    }
    case "PolygolfOp":
    case "MethodCall":
    case "BinaryOp":
    case "UnaryOp":
    case "MutatingBinaryOp":
      return getOpCodeType(expr, program);
    case "FunctionCall": {
      if (expr.ident.builtin) return getOpCodeType(expr, program);
      const fType = type(expr.ident);
      if (fType.kind !== "Function") {
        throw new PolygolfError(
          `Type error. Type ${toString(fType)} is not callable.`,
          expr.source
        );
      }
      if (expr.args.every((x, i) => isSubtype(type(x), fType.arguments[i]))) {
        return fType.result;
      }
      throw new PolygolfError(
        `Type error. Function '${expr.ident.name} expected [${fType.arguments
          .map(toString)
          .join(", ")}] but got [${expr.args
          .map((x) => toString(type(x)))
          .join(", ")}].`,
        expr.source
      );
    }
    case "Identifier":
      return getIdentifierType(expr, program);
    case "StringLiteral": {
      const codepoints = charLength(expr.value);
      return textType(
        integerType(codepoints, codepoints),
        codepoints === byteLength(expr.value)
      );
    }
    case "IntegerLiteral":
      return integerType(expr.value, expr.value);
    case "ArrayConstructor":
      return arrayType(
        expr.exprs.map(type).reduce((a, b) => union(a, b)),
        expr.exprs.length
      );
    case "ListConstructor":
      return expr.exprs.length > 0
        ? listType(expr.exprs.map(type).reduce((a, b) => union(a, b)))
        : listType("void");
    case "SetConstructor":
      return expr.exprs.length > 0
        ? setType(expr.exprs.map(type).reduce((a, b) => union(a, b)))
        : setType("void");
    case "KeyValue": {
      const k = type(expr.key);
      const v = type(expr.value);
      if (k.kind === "integer" || k.kind === "text") return keyValueType(k, v);
      throw new PolygolfError(
        `Type error. Operator 'key_value' error. Expected [-oo..oo | Text, T1] but got [${toString(
          k
        )}, ${toString(v)}].`,
        expr.source
      );
    }
    case "TableConstructor": {
      const types = expr.kvPairs.map(type);
      if (types.every((x) => x.kind === "KeyValue")) {
        const kvTypes = types as KeyValueType[];
        const kTypes = kvTypes.map((x) => x.key);
        const vTypes = kvTypes.map((x) => x.value);
        return expr.kvPairs.length > 0
          ? tableType(
              kTypes.reduce((a, b) => union(a, b) as any),
              vTypes.reduce((a, b) => union(a, b))
            )
          : tableType(integerType(), "void");
      }
      throw new Error(
        "Programming error. Type of KeyValue nodes should always be KeyValue."
      );
    }
    case "ConditionalOp": {
      const conditionType = type(expr.condition);
      if (isSubtype(conditionType, booleanType))
        return union(type(expr.consequent), type(expr.alternate));
      throw new PolygolfError(
        `Type error. Operator '${
          expr.isSafe ? "conditional" : "unsafe_conditional"
        }' error. Expected [Boolean, T1, T1] but got [${toString(
          conditionType
        )}, ${toString(type(expr.condition))}, ${toString(
          type(expr.alternate)
        )}].`,
        expr.source
      );
    }
    case "ManyToManyAssignment":
      return voidType;
    case "ImportStatement":
      return voidType;
    case "OneToManyAssignment":
      return type(expr.expr);
    case "IfStatement":
    case "ForRange":
    case "WhileLoop":
      return voidType;
  }
  throw new PolygolfError(
    `Type error. Unexpected node ${expr.kind}.`,
    expr.source
  );
}

function getTypeBitNot(t: IntegerType): IntegerType {
  return integerType(sub(-1n, t.high), sub(-1n, t.low));
}

function getOpCodeType(
  expr:
    | BinaryOp
    | MutatingBinaryOp
    | UnaryOp
    | FunctionCall
    | MethodCall
    | PolygolfOp,
  program: Program
): Type {
  const types = getArgs(expr).map((x) => getType(x, program));
  function expectType(...expected: Type[]) {
    if (
      types.length !== expected.length ||
      types.some((x, i) => !isSubtype(x, expected[i]))
    ) {
      throw new PolygolfError(
        `Type error. Operator '${
          expr.op ?? "null"
        }' type error. Expected [${expected
          .map(toString)
          .join(", ")}] but got [${types.map(toString).join(", ")}].`,
        expr.source
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
      throw new PolygolfError(
        `Type error. Operator '${
          expr.op ?? "null"
        } type error. Expected [${expectedS.join(", ")}] but got [${types
          .map(toString)
          .join(", ")}].`,
        expr.source
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
        min(max(abs(a.low), abs(a.high)), max(abs(b.low), abs(b.high)))
      );
    }
    case "add":
    case "sub":
    case "mul":
    case "div":
    case "trunc_div":
    case "pow":
    case "mod":
    case "rem":
    case "bit_and":
    case "bit_or":
    case "bit_xor":
    case "min":
    case "max":
      expectType(integerType(), integerType());
      return getArithmeticType(
        expr.op,
        types[0] as IntegerType,
        types[1] as IntegerType,
        expr.source
      );
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
    case "or":
    case "and":
      expectType(booleanType, booleanType);
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
      return expectGenericType("List", ["0..oo", (_) => integerType(0)])[0];
    case "table_get":
      return expectGenericType("Table", ["T1", (x) => x[0]])[1];
    case "argv_get":
      expectType(integerType(0));
      return textType();
    // other
    case "list_push":
      return expectGenericType("List", ["T1", (x) => x[0]])[0];
    case "text_concat": {
      expectType(textType(), textType());
      const [t1, t2] = types as [TextType, TextType];
      return textType(
        getArithmeticType("add", t1.codepointLength, t2.codepointLength),
        t1.isAscii && t2.isAscii
      );
    }
    case "repeat": {
      expectType(textType(), integerType(0));
      const [t, i] = types as [TextType, IntegerType];
      return textType(
        getArithmeticType("mul", t.codepointLength, i),
        t.isAscii
      );
    }
    case "text_contains":
      expectType(textType(), textType());
      return booleanType;
    case "text_codepoint_find":
    case "text_byte_find":
      expectType(textType(), textType());
      return integerType(
        -1,
        mul(
          sub((types[0] as TextType).codepointLength.high, 1n),
          expr.op === "text_byte_find" && !(types[0] as TextType).isAscii
            ? 4n
            : 1n
        )
      );
    case "text_split":
      expectType(textType(), textType());
      return listType(types[0]);
    case "text_get_byte":
    case "text_get_codepoint":
      expectType(textType(), integerType(0));
      return textType(integerType(1, 1), (types[0] as TextType).isAscii);
    case "join_using":
      expectType(listType(textType()), textType());
      return textType(
        integerType(0, "oo"),
        ((types[0] as ListType).member as TextType).isAscii &&
          (types[1] as TextType).isAscii
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
              t1.high.toString(expr.op === "int_to_bin_aligned" ? 2 : 16).length
            ),
            t2.high
          ),
          true
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
              Math.max(t2.low.toString().length, t2.high.toString().length)
          ),
          true
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
        max(abs(t.low), abs(t.high))
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
                    : 10
                ).length
              )
            )
          ),
          true
        );
      return textType(integerType(1), true);
    }
    case "text_to_int": {
      expectType(textType(integerType(), true));
      const t = types[0] as TextType;
      if (!isFiniteType(t.codepointLength)) return integerType();
      return integerType(
        1n - 10n ** (t.codepointLength.high - 1n),
        10n ** t.codepointLength.high - 1n
      );
    }
    case "bool_to_int":
      expectType(booleanType);
      return integerType(0, 1);
    case "byte_to_text":
      expectType(integerType(0, 255));
      return textType(integerType(1n, 1n), (types[0] as any).high < 128n);
    case "int_to_codepoint":
      expectType(integerType(0, 0x10ffff));
      return textType(integerType(1n, 1n), (types[0] as any).high < 128n);
    case "list_length":
      expectGenericType("List");
      return integerType(0);
    case "text_byte_length": {
      expectType(textType());
      const codepointLength = (types[0] as TextType).codepointLength;
      return integerType(
        codepointLength.low,
        mul(codepointLength.high, (types[0] as TextType).isAscii ? 1n : 4n)
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
    case "join":
      expectType(listType(textType()));
      return textType();
    case "text_byte_reversed":
    case "text_codepoint_reversed":
      expectType(textType());
      return types[0];
    // other
    case "true":
    case "false":
      expectType();
      return booleanType;
    case "argv":
      expectType();
      return listType(textType());
    case "print":
    case "println":
      return voidType;
    case "text_replace": {
      expectType(textType(), textType(), textType());
      const [a, c] = [types[0], types[2]] as TextType[];
      return textType(
        getArithmeticType("mul", a.codepointLength, c.codepointLength),
        a.isAscii && c.isAscii
      );
    }
    case "text_get_byte_slice":
    case "text_get_codepoint_slice": {
      expectType(textType(), integerType(0), integerType(0));
      const [t, i1, i2] = types as [TextType, IntegerType, IntegerType];
      const maximum = min(
        t.codepointLength.high,
        max(0n, sub(i2.high, i1.low))
      );
      return textType(integerType(0n, maximum), t.isAscii);
    }
    case "text_codepoint_ord":
      expectType(textType(), integerType(0));
      return integerType(0, (types[0] as TextType).isAscii ? 127 : 0x10ffff);
    case "text_byte_ord":
      expectType(textType(), integerType(0));
      return integerType(0, (types[0] as TextType).isAscii ? 127 : 255);
    case "array_set":
      return expectGenericType(
        "Array",
        ["T2", (x) => x[1]],
        ["T1", (x) => x[0]]
      )[0];
    case "list_set":
      return expectGenericType(
        "List",
        ["0..oo", (_) => integerType(0)],
        ["T1", (x) => x[0]]
      )[0];
    case "table_set":
      return expectGenericType(
        "Table",
        ["T1", (x) => x[0]],
        ["T2", (x) => x[1]]
      )[1];
    case null:
      throw new Error("Cannot determine type based on null opcode.");
  }
}

export function getArithmeticType(
  op: OpCode,
  a: IntegerType, // left argument
  b: IntegerType, // right argument
  source?: SourcePointer
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
        M(a.high, b.high)
      );
    }
    case "div": {
      const values: IntegerBound[] = [];
      if (lt(b.low, 0n)) {
        values.push(
          floorDiv(a.low, min(-1n, b.high)),
          floorDiv(a.high, min(-1n, b.high))
        );
      }
      if (lt(0n, b.high)) {
        values.push(
          floorDiv(a.low, max(1n, b.low)),
          floorDiv(a.high, max(1n, b.low))
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
          truncDiv(a.high, min(-1n, b.high))
        );
      }
      if (lt(0n, b.high)) {
        values.push(
          truncDiv(a.low, max(1n, b.low)),
          truncDiv(a.high, max(1n, b.low))
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
    case "pow": {
      if (lt(b.low, 0n))
        throw new PolygolfError(
          `Type error. Operator 'pow' expected [-oo..oo, 0..oo] but got ` +
            `[${toString(a)}, ${toString(b)}].`,
          source
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
              ...(b.high === 0n ? [1n] : (["-oo", "oo"] as IntegerBound[]))
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
        getArithmeticType("bit_or", getTypeBitNot(a), getTypeBitNot(b))
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
  throw new PolygolfError(
    `Type error. Unknown opcode. ${op ?? "null"}`,
    source
  );
}

export function getCollectionTypes(expr: Expr, program: Program): Type[] {
  const exprType = getType(expr, program);
  switch (exprType.kind) {
    case "Array":
    case "List":
    case "Set":
      return [exprType.member];
    case "Table":
      return [exprType.key, exprType.value];
  }
  throw new PolygolfError("Type error. Node is not a collection.", expr.source);
}

function getIntegerTypeMod(a: IntegerType, b: IntegerType): IntegerType {
  if (isConstantType(a) && isConstantType(b)) {
    return constantIntegerType(
      a.low - b.low * (floorDiv(a.low, b.low) as bigint)
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
