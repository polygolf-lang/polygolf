import { PolygolfError } from "../common/errors";
import { IR, OpCode } from "../IR";
import {
  booleanValue,
  BooleanValue,
  integerValue,
  IntegerValue,
  Value,
} from "./value";

export default function calcOpResult(
  node: IR.Node,
  op: OpCode,
  args: Value[]
): Value {
  function bad(): never {
    throw new PolygolfError(`Bad arguments of ${op}`, node.source);
  }
  function assertIntInt(args: Value[]): asserts args is IntegerValue[] {
    if (
      args.length !== 2 ||
      args[0].kind !== "integer" ||
      args[1].kind !== "integer"
    )
      bad();
  }
  function doIntInt(func: (a: bigint, b: bigint) => bigint): IntegerValue {
    assertIntInt(args);
    return integerValue(func(args[0].value, args[1].value));
  }
  function doIntIntBool(func: (a: bigint, b: bigint) => boolean): BooleanValue {
    assertIntInt(args);
    return booleanValue(func(args[0].value, args[1].value));
  }
  switch (op) {
    // ===== binary =====
    // (num, num) => num
    case "gcd":
      return doIntInt(gcd);
    case "add":
      return doIntInt((a, b) => a + b);
    case "sub":
      return doIntInt((a, b) => a - b);
    case "mul":
      return doIntInt((a, b) => a * b);
    case "div":
      return doIntInt((a, b) => (a - mod(a, b)) / b);
    case "trunc_div":
      return doIntInt((a, b) => a / b);
    case "pow":
      return doIntInt((a, b) => a ** b);
    case "mod":
      return doIntInt(mod);
    case "rem":
      return doIntInt((a, b) => a % b);
    case "bit_and":
      return doIntInt((a, b) => a & b);
    case "bit_or":
      return doIntInt((a, b) => a | b);
    case "bit_xor":
      return doIntInt((a, b) => a ^ b);
    case "min":
      return doIntInt((a, b) => (a < b ? a : b));
    case "max":
      return doIntInt((a, b) => (a > b ? a : b));
    // (num, num) => bool
    case "lt":
      return doIntIntBool((a, b) => a < b);
    case "leq":
      return doIntIntBool((a, b) => a <= b);
    case "eq":
      return doIntIntBool((a, b) => a === b);
    case "neq":
      return doIntIntBool((a, b) => a !== b);
    case "geq":
      return doIntIntBool((a, b) => a >= b);
    case "gt":
      return doIntIntBool((a, b) => a > b);
    // (bool, bool) => bool
    case "or":
    case "and":
      if (
        args.length !== 2 ||
        args[0].kind !== "boolean" ||
        args[1].kind !== "boolean"
      )
        bad();
      return {
        kind: "boolean",
        value:
          op === "or"
            ? args[0].value || args[1].value
            : args[0].value && args[1].value,
      };
    // ===== unary =====
    case "abs":
    case "bit_not":
    case "neg":
      if (args.length !== 1 || args[0].kind !== "integer") bad();
      return integerValue(
        op === "abs"
          ? abs(args[0].value)
          : op === "bit_not"
          ? ~args[0].value
          : -args[0].value
      );
    case "not":
      if (args.length !== 1 || args[0].kind !== "boolean") bad();
      return booleanValue(!args[0].value);
    default:
      throw "todo " + op;
    //   // membership
    //   case "array_contains":
    //     expectGenericType("Array", ["T1", (x) => x[0]]);
    //     return booleanType;
    //   case "list_contains":
    //     expectGenericType("List", ["T1", (x) => x[0]]);
    //     return booleanType;
    //   case "table_contains_key":
    //     expectGenericType("Table", ["T1", (x) => x[0]]);
    //     return booleanType;
    //   case "set_contains":
    //     expectGenericType("Set", ["T1", (x) => x[0]]);
    //     return booleanType;
    //   // collection get
    //   case "array_get":
    //     return expectGenericType("Array", ["T2", (x) => x[1]])[0];
    //   case "list_get":
    //     return expectGenericType("List", ["0..oo", (_) => integerType(0)])[0];
    //   case "table_get":
    //     return expectGenericType("Table", ["T1", (x) => x[0]])[1];
    //   case "text_get_byte":
    //     expectType(textType(), integerType(0));
    //     return integerType(0, 255);
    //   case "argv_get":
    //     expectType(integerType(0));
    //     return textType();
    //   // other
    //   case "list_push":
    //     return expectGenericType("List", ["T1", (x) => x[0]])[0];
    //   case "text_concat": {
    //     expectType(textType(), textType());
    //     const [t1, t2] = types as [TextType, TextType];
    //     return textType(t1.capacity + t2.capacity);
    //   }
    //   case "repeat": {
    //     expectType(textType(), integerType(0));
    //     const [t, i] = types as [TextType, IntegerType];
    //     return textType(mul(BigInt(t.capacity), i.high));
    //   }
    //   case "text_contains":
    //     expectType(textType(), textType());
    //     return booleanType;
    //   case "text_find":
    //     expectType(textType(), textType());
    //     return integerType(-1, (types[0] as TextType).capacity - 1);
    //   case "text_split":
    //     expectType(textType(), textType());
    //     return listType(types[0]);
    //   case "text_get_char":
    //     expectType(textType(), integerType(0));
    //     return textType(1);
    //   case "join_using":
    //     expectType(listType(textType()), textType());
    //     return textType();
    //   case "right_align":
    //     expectType(textType(), integerType(0));
    //     return textType();
    //   case "int_to_bin_aligned":
    //   case "int_to_hex_aligned": {
    //     expectType(integerType(0), integerType(0));
    //     const t1 = types[0] as IntegerType;
    //     const t2 = types[0] as IntegerType;
    //     if (isFiniteType(t1) && isFiniteType(t2)) {
    //       return textType(
    //         max(
    //           BigInt(
    //             t1.high.toString(expr.op === "int_to_bin_aligned" ? 2 : 16).length
    //           ),
    //           t2.high
    //         )
    //       );
    //     }
    //     return textType();
    //   }
    //   case "simplify_fraction": {
    //     expectType(integerType(), integerType());
    //     const t1 = types[0] as IntegerType;
    //     const t2 = types[1] as IntegerType;
    //     if (isFiniteType(t1) && isFiniteType(t2))
    //       return textType(
    //         1 +
    //           Math.max(t1.low.toString().length, t1.high.toString().length) +
    //           Math.max(t2.low.toString().length, t2.high.toString().length)
    //       );
    //     return textType();
    //   }
    //   // unary
    //   case "int_to_text":
    //   case "int_to_bin":
    //   case "int_to_hex": {
    //     expectType(integerType(expr.op === "int_to_text" ? "-oo" : 0));
    //     const t = types[0] as IntegerType;
    //     if (isFiniteType(t))
    //       return textType(
    //         Math.max(
    //           ...[t.low, t.high].map(
    //             (x) =>
    //               x.toString(
    //                 expr.op === "int_to_bin"
    //                   ? 2
    //                   : expr.op === "int_to_hex"
    //                   ? 16
    //                   : 10
    //               ).length
    //           )
    //         )
    //       );
    //     return textType();
    //   }
    //   case "text_to_int": {
    //     expectType(textType());
    //     const t = types[0] as TextType;
    //     if (t.capacity === Infinity) return integerType();
    //     return integerType(
    //       1n - 10n ** BigInt(t.capacity - 1),
    //       10n ** BigInt(t.capacity) - 1n
    //     );
    //   }
    //   case "bool_to_int":
    //     expectType(booleanType);
    //     return integerType(0, 1);
    //   case "byte_to_char":
    //     expectType(integerType(0, 255));
    //     return integerType(0, 1);
    //   case "list_length":
    //     expectGenericType("List");
    //     return integerType(0);
    //   case "text_length":
    //     expectType(textType());
    //     return integerType(0, (types[0] as TextType).capacity);
    //   case "text_split_whitespace":
    //     expectType(textType());
    //     return listType(types[0]);
    //   case "sorted":
    //     return listType(expectGenericType("List")[0]);
    //   case "join":
    //     expectType(listType(textType()));
    //     return textType();
    //   case "text_reversed":
    //     expectType(textType());
    //     return textType();
    //   // other
    //   case "true":
    //   case "false":
    //     expectType();
    //     return booleanType;
    //   case "argv":
    //     expectType();
    //     return listType(textType());
    //   case "print":
    //   case "println":
    //     return voidType;
    //   case "text_replace": {
    //     expectType(textType(), textType(), textType());
    //     const a = types[0] as TextType;
    //     const c = types[2] as TextType;
    //     return textType(a.capacity * c.capacity);
    //   }
    //   case "text_get_slice": {
    //     expectType(textType(), integerType(0), integerType(0));
    //     const [t, i1, i2] = types as [TextType, IntegerType, IntegerType];
    //     const c = max(
    //       0n,
    //       sub(
    //         min(t.capacity === Infinity ? "oo" : BigInt(t.capacity), i2.high),
    //         i1.low
    //       )
    //     );
    //     return textType(c);
    //   }
    //   case "array_set":
    //     return expectGenericType(
    //       "Array",
    //       ["T2", (x) => x[1]],
    //       ["T1", (x) => x[0]]
    //     )[0];
    //   case "list_set":
    //     return expectGenericType(
    //       "List",
    //       ["0..oo", (_) => integerType(0)],
    //       ["T1", (x) => x[0]]
    //     )[0];
    //   case "table_set":
    //     return expectGenericType(
    //       "Table",
    //       ["T1", (x) => x[0]],
    //       ["T2", (x) => x[1]]
    //     )[1];
  }
}

function abs(a: bigint) {
  return a < 0 ? -a : a;
}

function mod(a: bigint, b: bigint) {
  const r = a % b;
  return r < 0 ? r + b : r;
}

function gcd(a: bigint, b: bigint) {
  a = abs(a);
  b = abs(b);
  while (b > 0) {
    [a, b] = [b, a % b];
  }
  return a;
}
