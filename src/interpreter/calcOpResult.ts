// disable to allow comma-chaining asserts without too much TS magic
/* eslint-disable no-sequences */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { PolygolfError } from "../common/errors";
import { IR, OpCode } from "../IR";
import {
  booleanValue,
  BooleanValue,
  integerValue,
  IntegerValue,
  ListValue,
  listValue,
  TextValue,
  textValue,
  Value,
  valuesEqual,
  voidValue,
} from "./value";

export default function calcOpResult(
  node: IR.Node,
  op: OpCode,
  args: Value[],
  argv: ListValue & { value: TextValue[] }
): Value {
  const a = args[0] as Value | undefined;
  const b = args[1] as Value | undefined;
  const c = args[2] as Value | undefined;
  function bad(): never {
    throw new PolygolfError(`Bad arguments of ${op}`, node.source);
  }
  function assert<K extends Value["kind"]>(
    x: Value | undefined,
    k: K
  ): asserts x is Value & { kind: K } {
    if (x?.kind !== k) bad();
  }
  function doIntInt(func: (a: bigint, b: bigint) => bigint): IntegerValue {
    assert(a, "integer"), assert(b, "integer");
    return integerValue(func(a.value, b.value));
  }
  function doIntIntBool(func: (a: bigint, b: bigint) => boolean): BooleanValue {
    assert(a, "integer"), assert(b, "integer");
    return booleanValue(func(a.value, b.value));
  }
  function oob(): never {
    throw new PolygolfError(`${op} out of bounds`, node.source);
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
      // TODO: `or` and `and` short-circuiting? Then group them with ConditionalOp
      assert(a, "boolean"), assert(b, "boolean");
      return {
        kind: "boolean",
        value: op === "or" ? a.value || b.value : a.value && b.value,
      };
    // ===== unary =====
    case "abs":
    case "bit_not":
    case "neg":
      assert(a, "integer");
      return integerValue(
        op === "abs" ? abs(a.value) : op === "bit_not" ? ~a.value : -a.value
      );
    case "not":
      assert(a, "boolean");
      return booleanValue(!a.value);
    // ===== membership =====
    case "array_contains":
      // TODO check member type
      assert(a, "Array");
      if (b === undefined || b.kind === "void") bad();
      return booleanValue(a.value.some((x) => valuesEqual(x, b)));
    case "list_contains":
      // TODO check member type
      assert(a, "List");
      if (b === undefined || b.kind === "void") bad();
      return booleanValue(a.value.some((x) => valuesEqual(x, b)));
    case "set_contains":
      // TODO check member type
      assert(a, "Set");
      if (b === undefined || b.kind === "void") bad();
      return booleanValue([...a.value].some((x) => valuesEqual(x, b)));
    case "table_contains_key":
      // TODO check member type
      assert(a, "Table");
      if (b === undefined || b.kind === "void") bad();
      return booleanValue(
        [...a.value.keys()].some((x) =>
          valuesEqual(typeof x === "string" ? textValue(x) : integerValue(x), b)
        )
      );
    case "array_get":
    case "list_get":
      assert(b, "integer");
      if (a?.kind !== "Array" && a?.kind !== "List") bad();
      if (b.value < 0 || b.value >= a.value.length) oob();
      return a.value[Number(b.value)];
    case "table_get": {
      // TODO check key type
      assert(a, "Table");
      if (b?.kind !== "text" && b?.kind !== "integer") bad();
      const ret = a.value.get(b.value);
      if (ret === undefined)
        throw new PolygolfError(`Table missing key ${b.value}`, node.source);
      return ret;
    }
    case "text_get_byte": {
      assert(a, "text"), assert(b, "integer");
      // Assuming ASCII-only. charCodeAt indexes based on UTF-16?
      if (b.value < 0 || b.value >= a.value.length) oob();
      return integerValue(BigInt(a.value.charCodeAt(Number(b.value))));
    }
    case "argv_get":
      assert(a, "integer");
      if (a.value < 0 || a.value >= argv.value.length) oob();
      return argv.value[Number(a.value)];
    case "list_push":
      // WARNING: MUTATING
      assert(a, "List");
      if (b === undefined) bad();
      a.value.push(b);
      return voidValue;
    // ===== text =====
    case "text_concat":
      assert(a, "text"), assert(b, "text");
      return textValue(a.value + b.value);
    case "repeat":
      assert(a, "text"), assert(b, "integer");
      return textValue([...Array(Number(b.value))].map(() => a.value).join(""));
    case "text_contains":
      assert(a, "text"), assert(b, "text");
      return booleanValue(a.value.includes(b.value));
    case "text_find":
      assert(a, "text"), assert(b, "text");
      return integerValue(BigInt(a.value.indexOf(b.value)));
    case "text_split":
      assert(a, "text"), assert(b, "text");
      return listValue(a.value.split(b.value).map(textValue));
    case "text_split_whitespace":
      assert(a, "text");
      return listValue(
        a.value
          .split(" ")
          // filter out both inner and trailing empty strings
          .filter((x) => x !== "")
          .map(textValue)
      );
    case "text_get_char":
      assert(a, "text"), assert(b, "integer");
      // Assuming ASCII-only.
      return textValue(a.value[Number(b.value)]);
    case "join_using":
      assert(a, "List"), assert(b, "text");
      return textValue(
        a.value.map((x) => (assert(x, "text"), x.value)).join(b.value)
      );
    case "join":
      assert(a, "List");
      return textValue(a.value.map((x) => assert(x, "text")).join(""));
    case "int_to_text":
    case "int_to_bin":
    case "int_to_hex":
      assert(a, "integer");
      return textValue(
        a.value.toString(
          op === "int_to_text" ? 10 : op === "int_to_bin" ? 2 : 16
        )
      );
    case "text_to_int":
      assert(a, "text");
      return integerValue(BigInt(a.value));
    case "bool_to_int":
      assert(a, "boolean");
      return integerValue(a.value ? 1n : 0n);
    case "byte_to_char":
      assert(a, "integer");
      // assuming ASCII, but not really (assuming 8-bit)
      if (a.value < 0 || a.value > 255) oob();
      return textValue(String.fromCharCode(Number(a.value)));
    case "list_length":
      assert(a, "List");
      return integerValue(BigInt(a.value.length));
    case "text_length":
      assert(a, "text");
      return integerValue(BigInt(a.value.length));
    case "sorted":
      assert(a, "List");
      if (a.value.every((x) => x.kind === "integer"))
        return listValue(
          a.value
            .map((u) => (u as IntegerValue).value)
            .sort((x, y) => Number(x - y))
            .map(integerValue)
        );
      else if (a.value.every((x) => x.kind === "text"))
        return listValue(
          a.value
            .map((u) => (u as TextValue).value)
            .sort()
            .map(textValue)
        );
      else return bad();
    case "text_reversed":
      assert(a, "text");
      // Assumes ASCII
      return textValue([...a.value].reverse().join(""));
    case "true":
      return booleanValue(true);
    case "false":
      return booleanValue(false);
    case "argv":
      return argv;
    // ===== three-way ops =====
    case "text_replace":
      assert(a, "text"), assert(b, "text"), assert(c, "text");
      // might assume ASCII?
      return textValue(a.value.replaceAll(b.value, c.value));
    case "text_get_slice":
      assert(a, "text"), assert(b, "integer"), assert(c, "integer");
      if (b.value < 0 || c.value < 0) oob();
      // allow out-of-bounds to the right. The string stops, no problem.
      return textValue(a.value.slice(Number(b.value), Number(c.value)));
    case "array_set":
    case "list_set":
      // TODO: check member type
      if (a?.kind !== "List" && a?.kind !== "Array") bad();
      assert(b, "integer");
      if (c === undefined || c.kind === "void") bad();
      if (b.value < 0 || b.value >= a.value.length) oob();
      a.value[Number(b.value)] = b;
      return b;
    case "table_set":
      // TODO: check member type
      assert(a, "Table");
      if (b?.kind !== "text" && b?.kind !== "integer") bad();
      if (c === undefined || c.kind === "void") bad();
      a.value.set(b.value, c);
      return c;
    // ===== other =====
    case "print":
    case "println":
      throw new PolygolfError(
        `Op ${op} unexpected; should have been handled in main interpreter`
      );
    case "right_align":
    case "int_to_bin_aligned":
    case "int_to_hex_aligned":
    case "simplify_fraction":
      throw new PolygolfError("Not yet implemented");
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
