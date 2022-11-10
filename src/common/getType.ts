import {
  Program,
  Expr,
  ValueType,
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
} from "../IR";
import { PolygolfError } from "./errors";

export function getType(expr: Expr, program: Program): ValueType {
  if (expr.valueType === undefined) {
    expr.valueType = calcType(expr, program);
  }
  return expr.valueType;
}

export function calcType(expr: Expr, program: Program): ValueType {
  const type = (e: Expr) => getType(e, program);
  switch (expr.type) {
    case "Function": {
      function setVar(name: string, type: ValueType) {
        if (program.variables.has(name)) {
          throw new PolygolfError(
            `Duplicate variable declaration: ${name}!`,
            expr.source
          );
        }
        program.variables.set(name, type);
      }
      for (const arg of expr.args) {
        if (arg.valueType !== undefined) {
          setVar(arg.name, arg.valueType);
        }
      }
      return functionType(expr.args.map(type), type(expr.expr));
    }
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
      let expectedIndex: ValueType;
      let result: ValueType;
      switch (a.type) {
        case "Array":
          expectedIndex = expr.oneIndexed
            ? integerType(1, a.length)
            : integerType(0, a.length - 1);
          result = a.member;
          break;
        case "List": {
          expectedIndex = integerType(expr.oneIndexed ? 1 : 0, undefined);
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
      if (fType.type !== "Function") {
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
      if (program.variables.has(expr.name)) {
        return program.variables.get(expr.name)!;
      }
      throw new PolygolfError(
        `Type error. Undeclared variable ${expr.name} encountered!`,
        expr.source
      );
    case "StringLiteral":
      return textType(expr.value.length);
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
      if (k.type === "integer" || k.type === "text") return keyValueType(k, v);
      throw new PolygolfError(
        `Type error. Operator 'key_value' error. Expected [-oo..oo | Text, T1] but got [${toString(
          k
        )}, ${toString(v)}].`,
        expr.source
      );
    }
    case "TableConstructor": {
      const types = expr.kvPairs.map(type);
      if (types.every((x) => x.type === "KeyValue")) {
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
    case "ConditionalOp":
      return union(type(expr.consequent), type(expr.alternate));
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
    `Type error. Unexpected node ${expr.type}.`,
    expr.source
  );
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
): ValueType {
  const types = getArgs(expr).map((x) => getType(x, program));
  function expectType(...expected: ValueType[]) {
    if (
      types.length !== expected.length ||
      types.every((x, i) => !isSubtype(x, expected[i]))
    ) {
      throw new PolygolfError(
        `Type error. Operator '${
          expr.op ?? "null"
        } type error. Expected [${expected
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
      | [string, (typeArgs: ValueType[]) => ValueType]
    )[]
  ): ValueType[] {
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
    const typeArgs: ValueType[] = [];
    for (let i = 0; i < types.length; i++) {
      const exp = expected[i];
      const got = types[i];
      if (typeof exp === "string") {
        if (exp === "List" && got.type === "List") {
          typeArgs.push(got.member);
        } else if (exp === "Array" && got.type === "Array") {
          typeArgs.push(got.member);
          typeArgs.push(integerType(0, got.length - 1));
        } else if (exp === "Set" && got.type === "Set") {
          typeArgs.push(got.member);
        } else if (exp === "Table" && got.type === "Table") {
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
    case "gcd":
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
    case "text_get_byte":
      expectType(textType(), integerType(0));
      return integerType(0, 255);
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
        t1.capacity === undefined || t2.capacity === undefined
          ? undefined
          : t1.capacity + t2.capacity
      );
    }
    case "repeat": {
      expectType(textType(), integerType(0));
      const [t, i] = types as [TextType, IntegerType];
      return textType(
        t.capacity === undefined || i.high === undefined
          ? undefined
          : t.capacity * Number(i.high)
      );
    }
    case "text_contains":
      expectType(textType(), textType());
      return booleanType;
    case "text_find":
      expectType(textType(), textType());
      return integerType(-1, (types[0] as TextType).capacity);
    case "text_split":
      expectType(textType(), textType());
      return listType(types[0]);
    case "text_get_char":
      expectType(textType(), integerType(0));
      return textType(1);
    case "join_using":
      expectType(listType(textType()), textType());
      return textType();
    case "right_align":
      expectType(listType(textType()), integerType(0));
      return textType(); // TODO narrow this
    case "int_to_bin_aligned":
    case "int_to_hex_aligned":
      expectType(integerType(), textType());
      return textType(); // TODO narrow this
    case "simplify_fraction":
      expectType(integerType(), integerType());
      return textType(); // TODO narrow this
    // unary
    case "abs": {
      expectType(integerType());
      const t = types[0] as IntegerType;
      return integerType(
        0,
        t.low === undefined || t.high === undefined
          ? undefined
          : -t.low > t.high
          ? -t.low
          : t.high
      );
    }
    case "bit_not":
      expectType(integerType());
      return integerType();
    case "neg": {
      expectType(integerType());
      const t = types[0] as IntegerType;
      return integerType(
        t.high === undefined ? undefined : -t.high,
        t.low === undefined ? undefined : -t.low
      );
    }
    case "not":
      expectType(booleanType);
      return booleanType;
    case "int_to_text":
    case "int_to_bin":
    case "int_to_hex":
      expectType(integerType());
      return textType(); // TODO narrow this
    case "text_to_int":
      expectType(textType()); // TODO narrow this
      return integerType();
    case "bool_to_int":
      expectType(booleanType);
      return integerType(0, 1);
    case "byte_to_char":
      expectType(integerType(0, 255));
      return integerType(0, 1);
    case "list_length":
      expectGenericType("List");
      return integerType(0);
    case "text_length":
      expectType(textType());
      return integerType(0, (types[0] as TextType).capacity);
    case "text_split_whitespace":
      expectType(textType());
      return listType(types[0]);
    case "sorted":
      return listType(expectGenericType("List")[0]);
    case "join":
      expectType(listType(textType()));
      return textType();
    case "text_reversed":
      expectType(textType());
      return textType();
    // other
    case "true":
      return booleanType;
    case "false":
      return booleanType;
    case "argv":
      return listType(textType());
    case "print":
    case "println":
      return voidType;
    case "text_replace":
      expectType(textType(), textType(), textType());
      return textType(); // TODO narrow this
    case "text_get_slice": {
      expectType(textType(), integerType(0), integerType(0));
      const [t, i1, i2] = types as [TextType, IntegerType, IntegerType];
      return textType(
        t.capacity === undefined && i2.high === undefined
          ? undefined
          : Math.max(
              0,
              t.capacity === undefined
                ? Number(i2.high! - (i1.low ?? 0n))
                : t.capacity - Number(i1.low ?? 0)
            )
      );
    }
    case "array_set":
      return expectGenericType(
        "Array",
        ["T2", (x) => x[1]],
        ["T1", (x) => x[0]]
      )[1];
    case "list_set":
      return expectGenericType(
        "List",
        ["0..oo", (_) => integerType(0)],
        ["T1", (x) => x[0]]
      )[1];
    case "table_set":
      return expectGenericType(
        "Table",
        ["T1", (x) => x[0]],
        ["T2", (x) => x[1]]
      )[1];
  }
  throw new PolygolfError(
    `Type error. Unknown opcode. ${expr.op ?? "null"}`,
    expr.source
  );
}

function getArithmeticType(
  op: OpCode,
  left: IntegerType,
  right: IntegerType,
  source?: SourcePointer
): ValueType {
  switch (op) {
    case "gcd":
      if (
        left.low === undefined ||
        left.high === undefined ||
        right.high === undefined ||
        right.low === undefined
      )
        return integerType(1n, undefined);
      return integerType(
        1n,
        [left.low, left.high, right.low, right.high]
          .map((x) => (x < 0 ? -x : x))
          .reduce((a, b) => (a < b ? a : b))
      );
    case "min": {
      let low;
      let high;
      if (left.low !== undefined && right.low !== undefined)
        low = left.low < right.low ? left.low : right.low;
      if (left.high !== undefined && right.high !== undefined)
        high = left.high < right.high ? left.high : right.high;
      return integerType(low, high);
    }
    case "max": {
      let low;
      let high;
      if (left.low !== undefined && right.low !== undefined)
        low = left.low > right.low ? left.low : right.low;
      if (left.high !== undefined && right.high !== undefined)
        high = left.high > right.high ? left.high : right.high;
      return integerType(low, high);
    }
    case "add":
      return integerType(
        left.low === undefined || right.low === undefined
          ? undefined
          : left.low + right.low,
        left.high === undefined || right.high === undefined
          ? undefined
          : left.high + right.high
      );
    case "sub":
      return integerType(
        left.low === undefined || right.high === undefined
          ? undefined
          : left.low - right.high,
        left.high === undefined || right.low === undefined
          ? undefined
          : left.high - right.low
      );
    case "mul":
      return getIntegerTypeUsing(left, right, (a, b) => a * b);
    case "div":
      return integerType(); // TODO narrow this
    case "trunc_div":
      return integerType(); // TODO narrow this
    case "mod":
      return getIntegerTypeMod(left, right);
    case "rem":
      return getIntegerTypeRem(left, right);
    case "pow":
      return getIntegerTypeUsing(
        left,
        (right.low ?? 1n) < 0n ? integerType(0n, right.high) : right,
        (a, b) => a ** b
      );
    case "bit_and":
      return integerType();
    case "bit_or":
      return integerType();
    case "bit_xor":
      return integerType();
  }
  throw new PolygolfError(
    `Type error. Unknown opcode. ${op ?? "null"}`,
    source
  );
}

export function getCollectionTypes(expr: Expr, program: Program): ValueType[] {
  const exprType = getType(expr, program);
  switch (exprType.type) {
    case "Array":
    case "List":
    case "Set":
      return [exprType.member];
    case "Table":
      return [exprType.key, exprType.value];
  }
  throw new PolygolfError("Type error. Node is not a collection.", expr.source);
}

/*
function floorDiv(a: bigint, b: bigint): bigint {
  const res = a / b;
  return a < 0 !== b < 0 ? res - 1n : res;
}
*/

/** Combines types `left` and `right` using the *convex* operator `op` */
function getIntegerTypeUsing(
  left: IntegerType,
  right: IntegerType,
  op: (a: bigint, b: bigint) => bigint
): IntegerType {
  if (
    left.low === undefined ||
    left.high === undefined ||
    right.low === undefined ||
    right.high === undefined
  )
    return integerType();
  return integerTypeIncludingAll([
    op(left.low, right.low),
    op(left.low, right.high),
    op(left.high, right.low),
    op(left.high, right.high),
  ]);
}

function getIntegerTypeMod(left: IntegerType, right: IntegerType): IntegerType {
  if (right.low === undefined || right.high === undefined) {
    if (left.low === undefined || left.high === undefined) {
      return integerType();
    }
    const m = left.high > -left.low ? left.high : -left.low;
    return integerType(-m, m);
  }
  if (
    left.low === undefined ||
    left.high === undefined ||
    left.low <= 0n ||
    left.high >= right.high
  ) {
    const values = [0n];
    if (right.low < 0n) values.push(right.low + 1n);
    if (right.high > 0n) values.push(right.high - 1n);
    return integerTypeIncludingAll(values);
  }
  return left;
}

function getIntegerTypeRem(left: IntegerType, right: IntegerType): IntegerType {
  if (right.low === undefined || right.high === undefined) {
    return integerType();
  }
  const m = right.high > -right.low ? right.high : -right.low;
  return integerType(-m, m);
}
