import {
  type Node,
  type Type,
  voidType,
  textType as text,
  listType as list,
  arrayType as array,
  integerType as int,
  setType as set,
  tableType as table,
  integerTypeIncludingAll,
  type IntegerType,
  type Op,
  isSubtype,
  union,
  toString,
  type TextType,
  booleanType,
  type OpCode,
  type KeyValueType,
  keyValueType,
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
  op,
  leq,
  isIdent,
  instantiateGenerics,
  type ArrayType,
  type TableType,
  opCodeDefinitions,
  type AnyOpCodeArgTypes,
  OpCodeFrontNamesToOpCodes,
  type Rest,
  lengthToArrayIndexType,
  isOpCode,
  opArgsWithDefaults,
  minArity,
  maxArity,
  type PhysicalOpCode,
  argsOf,
  isVirtualOpCode,
  annotate,
  uniqueId,
} from "../IR";
import { byteLength, charLength } from "./strings";
import { InvariantError, UserError } from "./errors";
import { type Spine } from "./Spine";
import { getIdentifierType, isIdentifierReadonly } from "./symbols";
import { stringify } from "./stringify";

interface TypeAndOpCode {
  type: Type;
  opCode?: OpCode;
}

const cachedType = new WeakMap<Node, TypeAndOpCode>();
const currentlyFinding = new WeakSet<Node>();
export function getTypeAndResolveOpCode(
  expr: Node,
  context: Node | Spine,
  addWarning = (x: Error) => {},
): TypeAndOpCode {
  const program = "kind" in context ? context : context.root.node;
  if (cachedType.has(expr)) return cachedType.get(expr)!;
  if (currentlyFinding.has(expr))
    throw new UserError(`Node defined in terms of itself`, expr);

  currentlyFinding.add(expr);
  try {
    let t = calcTypeAndResolveOpCode(expr, program, addWarning);
    if ("kind" in t) t = { type: t };
    currentlyFinding.delete(expr);
    cachedType.set(expr, t);
    return t;
  } catch (e) {
    currentlyFinding.delete(expr);
    if (
      e instanceof Error &&
      !(e instanceof InvariantError) &&
      !(e instanceof UserError)
    ) {
      throw new InvariantError(e.message, e);
    }
    throw e;
  }
}

export function getType(expr: Node, context: Node | Spine) {
  return getTypeAndResolveOpCode(expr, context).type;
}

export function calcTypeAndResolveOpCode(
  expr: Node,
  program: Node,
  addWarning = (x: Error) => {},
): Type | TypeAndOpCode {
  // Resolve unresolved ops
  if (expr.kind === "Op" && !isOpCode(expr.op)) {
    const inferred = resolveUnresolvedOpCode(expr, program, addWarning);
    return { type: expr.type ?? inferred.type, opCode: inferred.opCode };
  }
  // user-annotated node
  if (expr.type !== undefined) {
    return expr.type;
  }
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
        throw new UserError(
          `Type error. Cannot assign to readonly identifier ${expr.variable.name}.`,
          expr,
        );
      }
      const a = type(expr.variable);
      const b = type(expr.expr);
      if (isSubtype(b, a)) {
        return b;
      }
      throw new UserError(
        `Type error. Cannot assign ${toString(b)} to ${toString(a)}.`,
        expr,
      );
    }
    case "Op":
      return getOpCodeType(expr, program);
    case "FunctionCall": {
      const fType = type(expr.func);
      if (fType.kind !== "Function") {
        throw new UserError(
          `Type error. Type ${toString(fType)} is not callable.`,
          expr,
        );
      }
      if (expr.args.every((x, i) => isSubtype(type(x), fType.arguments[i]))) {
        return fType.result;
      }
      throw new UserError(
        `Type error. Function expected [${fType.arguments
          .map(toString)
          .join(", ")}] but got [${expr.args
          .map((x) => toString(type(x)))
          .join(", ")}].`,
        expr,
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
        expr.value.map(type).reduce((a, b) => union(a, b)),
        lengthToArrayIndexType(expr.value.length),
      );
    case "List":
      return expr.value.length > 0
        ? list(expr.value.map(type).reduce((a, b) => union(a, b)))
        : list(voidType);
    case "Set":
      return expr.value.length > 0
        ? set(expr.value.map(type).reduce((a, b) => union(a, b)))
        : set(voidType);
    case "KeyValue": {
      const k = type(expr.key);
      const v = type(expr.value);
      if (k.kind === "integer" || k.kind === "text") return keyValueType(k, v);
      throw new UserError(
        `Type error. Operator 'key_value' error. Expected [-oo..oo | Text, T1] but got [${toString(
          k,
        )}, ${toString(v)}].`,
        expr,
      );
    }
    case "Table": {
      const types = expr.value.map(type);
      if (types.every((x) => x.kind === "KeyValue")) {
        const kvTypes = types as KeyValueType[];
        const kTypes = kvTypes.map((x) => x.key);
        const vTypes = kvTypes.map((x) => x.value);
        return expr.value.length > 0
          ? table(
              kTypes.reduce((a, b) => union(a, b) as any),
              vTypes.reduce((a, b) => union(a, b)),
            )
          : table(int(), voidType);
      }
      throw new UserError(
        "Programming error. Type of KeyValue nodes should always be KeyValue.",
        expr,
      );
    }
    case "ConditionalOp": {
      const conditionType = type(expr.condition);
      if (isSubtype(conditionType, booleanType))
        return union(type(expr.consequent), type(expr.alternate));
      throw new UserError(
        `Type error. Operator '${
          expr.isSafe ? "conditional" : "unsafe_conditional"
        }' error. Expected [Boolean, T1, T1] but got [${toString(
          conditionType,
        )}, ${toString(type(expr.condition))}, ${toString(
          type(expr.alternate),
        )}].`,
        expr,
      );
    }
    case "ManyToManyAssignment":
      return voidType;
    case "Import":
      return voidType;
    case "OneToManyAssignment":
      return type(expr.expr);
    case "If":
    case "While":
    case "ForArgv":
    case "ForCLike":
    case "ForEach":
      return voidType;
    case "ImplicitConversion": {
      return type(op[expr.behavesLike](expr.expr));
    }
  }
  throw new InvariantError(`Type error. Unexpected node ${stringify(expr)}.`);
}

function getTypeBitNot(t: IntegerType): IntegerType {
  return int(sub(-1n, t.high), sub(-1n, t.low));
}

export function getInstantiatedOpCodeArgTypes(op: OpCode): Type[] {
  return getGenericOpCodeArgTypes(op).map(
    instantiateGenerics({ T1: int(0, 100), T2: int(0, 100) }),
  );
}

export function getGenericOpCodeArgTypes(op: OpCode): Type[] {
  const type = opCodeDefinitions[op].args;
  return type.filter((x) => !("rest" in x)) as Type[];
}

export function expectedTypesAsStrings(opCode: OpCode): string[] {
  return opCodeDefinitions[opCode].args.map((x) =>
    "rest" in x ? `...${toString(x.rest)}` : toString(x),
  );
}

/**
 * Simple algorithm for validating types of arguments of ops. Type vars are only bound by being used as an arg to a List, Array, Set or Table at a top level.
 * TODO: More general unifying algo.
 * @param gotTypes List of actual types provided.
 * @param expectedTypes Expected types (array of types or variadic object).
 * @returns True iff it is a match.
 */
function isTypeMatch(gotTypes: Type[], expectedTypes: AnyOpCodeArgTypes) {
  const isVariadic =
    expectedTypes.length > 0 && "rest" in expectedTypes.at(-1)!;
  if (isVariadic && gotTypes.length < expectedTypes.length - 1) return false;
  if (!isVariadic && expectedTypes.length !== gotTypes.length) return false;
  const params: Record<string, Type> = {};
  const instantiate = instantiateGenerics(params);
  let i = 0;
  for (let got of gotTypes) {
    got = instantiate(got);
    let exp = instantiate(
      isVariadic && i >= expectedTypes.length - 1
        ? (expectedTypes.at(-1) as Rest).rest
        : (expectedTypes[i] as Type),
    );
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

export function getOpCodeTypeFromTypes(
  opCode: OpCode,
  got: Type[],
  skipAdditionalChecks = false,
): Type {
  if (isVirtualOpCode(opCode)) {
    const x = op.unsafe(opCode)(
      ...got.map((t) => annotate(uniqueId("getType"), t)),
    );
    return getType(x, x);
  }
  return _getOpCodeTypeFromTypes(opCode, got, skipAdditionalChecks);
}

function _getOpCodeTypeFromTypes(
  opCode: PhysicalOpCode,
  got: Type[],
  skipAdditionalChecks = false,
): Type {
  switch (opCode) {
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
        getArithmeticType(opCode, a as IntegerType, b as IntegerType),
      );
    // (num, num) => bool
    case "lt":
    case "leq":
    case "eq[Int]":
    case "neq[Int]":
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
    case "contains[Array]":
    case "contains[List]":
    case "contains[Table]":
    case "contains[Set]":
      return booleanType;
    // collection get
    case "at[Array]":
      return (got[0] as ArrayType).member;
    case "at[List]":
    case "at_back[List]":
      return (got[0] as ListType).member;
    case "at[Table]":
      return (got[0] as TableType).value;
    // other
    case "include":
      return voidType;
    case "append":
    case "concat[List]":
      return got[0];
    case "find[List]":
      return int(-1, (1n << 31n) - 1n);
    case "concat[Text]": {
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
    case "eq[Text]":
    case "neq[Text]":
    case "contains[Text]":
      return booleanType;
    case "find[codepoint]":
    case "find[byte]":
    case "find[Ascii]":
      return int(
        -1,
        sub(
          mul(
            (got[0] as TextType).codepointLength.high,
            opCode === "find[byte]" && !(got[0] as TextType).isAscii ? 4n : 1n,
          ),
          (got[1] as TextType).codepointLength.low,
        ),
      );
    case "split":
      return list(got[0]);
    case "join":
      return text(
        int(0, "oo"),
        ((got[0] as ListType).member as TextType).isAscii &&
          (got[1] as TextType).isAscii,
      );
    case "right_align":
      return text(int(0, "oo"), (got[0] as TextType).isAscii);
    case "int_to_bin_aligned":
    case "int_to_hex_aligned":
    case "int_to_Hex_aligned": {
      const t1 = got[0] as IntegerType;
      const t2 = got[1] as IntegerType;
      if (isFiniteType(t1) && isFiniteType(t2)) {
        return text(
          integerTypeIncludingAll(
            BigInt(
              t1.high.toString(opCode === "int_to_bin_aligned" ? 2 : 16).length,
            ),
            t2.high,
          ),
          true,
        );
      }
      return text(int(), true);
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
    case "bit_count":
      return int(0, BigInt((got[0] as IntegerType).high.toString(2).length));
    case "not":
      return booleanType;
    case "int_to_bool":
      return booleanType;
    case "int_to_dec":
    case "int_to_bin":
    case "int_to_hex":
    case "int_to_Hex": {
      const t = got[0] as IntegerType;
      if (isFiniteType(t))
        return text(
          integerTypeIncludingAll(
            ...[t.low, t.high, ...(typeContains(t, 0n) ? [0n] : [])].map((x) =>
              BigInt(
                x.toString(
                  opCode === "int_to_bin"
                    ? 2
                    : opCode === "int_to_dec"
                      ? 10
                      : 16,
                ).length,
              ),
            ),
          ),
          true,
        );
      return text(int(1), true);
    }
    case "dec_to_int": {
      const t = got[0] as TextType;
      if (!isFiniteType(t.codepointLength)) return int();
      return int(
        1n - 10n ** (t.codepointLength.high - 1n),
        10n ** t.codepointLength.high - 1n,
      );
    }
    case "bool_to_int":
      return int(0, 1);
    case "char[byte]":
    case "char[codepoint]":
    case "char[Ascii]":
      return text(int(1n, 1n), lt((got[0] as IntegerType).high, 128n));
    case "text_to_list[Ascii]":
    case "text_to_list[byte]":
    case "text_to_list[codepoint]":
      return list(text(int(1, 1), (got[0] as TextType).isAscii));
    case "size[List]":
    case "size[Set]":
    case "size[Table]":
      return int(0, (1n << 31n) - 1n);
    case "split_whitespace":
      return list(got[0]);
    case "sorted[Int]":
    case "sorted[Ascii]":
    case "reversed[byte]":
    case "reversed[codepoint]":
    case "reversed[Ascii]":
    case "reversed[List]":
      return got[0];
    // other
    case "true":
    case "false":
      return booleanType;
    case "read[codepoint]":
      return text(int(1, 1));
    case "read[byte]":
      return text(int(1, 1));
    case "read[Int]":
      return int();
    case "read[line]":
      return text();
    case "argc":
      return int(0, 2 ** 31 - 1);
    case "argv":
      return list(text());
    case "print[Text]":
    case "println[Text]":
      return voidType;
    case "println_list_joined":
      return voidType;
    case "println_many_joined":
      return voidType;
    case "replace": {
      const [a, c] = [got[0], got[2]] as TextType[];
      return text(
        getArithmeticType("mul", a.codepointLength, c.codepointLength),
        a.isAscii && c.isAscii,
      );
    }
    case "text_multireplace":
      return text();
    case "starts_with":
    case "ends_with":
      return booleanType;
    case "slice[byte]":
    case "slice[codepoint]":
    case "slice[Ascii]":
    case "slice_back[byte]":
    case "slice_back[codepoint]":
    case "slice_back[Ascii]": {
      const t = got[0] as TextType;
      const start = got[1] as IntegerType;
      const length = got[2] as IntegerType;
      const startPlusLength = getArithmeticType("add", start, length);
      if (
        skipAdditionalChecks ||
        !opCode.includes("back") ||
        isSubtype(startPlusLength, int(-Infinity, 0))
      )
        return text(
          int(0n, min(t.codepointLength.high, length.high)),
          t.isAscii,
        );
      throw new UserError(
        `Type error. start index + length must be nonpositive, but got ${toString(
          startPlusLength,
        )}.`,
        undefined,
      );
    }
    case "slice[List]":
      return got[0];
    case "slice_back[List]": {
      const start = got[1] as IntegerType;
      const length = got[2] as IntegerType;
      const startPlusLength = getArithmeticType("add", start, length);
      if (skipAdditionalChecks || isSubtype(startPlusLength, int(-Infinity, 0)))
        return got[0];
      throw new UserError(
        `Type error. start index + length must be nonpositive, but got ${toString(
          startPlusLength,
        )}.`,
        undefined,
      );
    }
    case "ord[codepoint]":
      return int(0, (got[0] as TextType).isAscii ? 127 : 0x10ffff);
    case "ord[byte]":
    case "ord[Ascii]":
      return int(0, (got[0] as TextType).isAscii ? 127 : 255);
    case "with_at[Array]":
    case "with_at[List]":
    case "with_at_back[List]":
    case "with_at[Table]":
      return got[0];
    case "range_incl":
      return list(
        int((got[0] as IntegerType).low, (got[1] as IntegerType).high),
      );
    case "range_excl":
      return list(
        int((got[0] as IntegerType).low, sub((got[1] as IntegerType).high, 1n)),
      );
    case "range_diff_excl":
      return list(
        int(
          (got[0] as IntegerType).low,
          sub(
            add((got[0] as IntegerType).high, (got[1] as IntegerType).high),
            1n,
          ),
        ),
      );
  }
}

function getOpCodeType(expr: Op, program: Node): Type {
  let opCode: OpCode = expr.op;
  let args = expr.args;
  const specialCasedVirtualOpCodes = [
    "size[byte]",
    "size[codepoint]",
    "size[Ascii]",
  ] as const;
  for (const virtualOpCode of specialCasedVirtualOpCodes) {
    const args2 = argsOf(virtualOpCode)(expr);
    if (args2 !== undefined) {
      args = args2;
      opCode = virtualOpCode;
      break;
    }
  }

  const got = args.map((x) => getType(x, program));

  if (!isTypeMatch(got, opCodeDefinitions[opCode].args)) {
    throw new UserError(
      `Type error. Operator '${
        expr.op
      }' type error. Expected ${expectedTypesAsStrings(expr.op).join(
        ", ",
      )} but got [${got.map(toString).join(", ")}].`,
      expr,
    );
  }

  switch (opCode) {
    case "size[byte]": {
      const codepointLength = (got[0] as TextType).codepointLength;
      return int(
        codepointLength.low,
        min(
          1n << 31n,
          mul(codepointLength.high, (got[0] as TextType).isAscii ? 1n : 4n),
        ),
      );
    }
    case "size[codepoint]":
    case "size[Ascii]":
      return (got[0] as TextType).codepointLength;
  }
  try {
    return _getOpCodeTypeFromTypes(expr.op, got);
  } catch (e) {
    if (e instanceof UserError) {
      e.source = expr.source;
    }
    throw e;
  }
}

function resolveUnresolvedOpCode(
  expr: Op,
  program: Node,
  addWarning = (x: Error) => {},
): TypeAndOpCode {
  const matchingOpCodes = OpCodeFrontNamesToOpCodes[expr.op];
  const legacyDotDot: OpCode[] = ["concat[List]", "concat[Text]", "append"];
  if (expr.op === (".." as any)) {
    // we special case .. here for backwards compat
    matchingOpCodes.push(...legacyDotDot);
  }
  const arityMatchingOpCodes = matchingOpCodes.filter(
    (opCode) =>
      minArity(opCode) <= expr.args.length &&
      expr.args.length <= maxArity(opCode),
  );

  const opCode = arityMatchingOpCodes
    .filter((opCode) => minArity(opCode))
    .find((opCode) =>
      isTypeMatch(
        opArgsWithDefaults(opCode, expr.args).map((x) => getType(x, program)),
        opCodeDefinitions[opCode].args,
      ),
    );

  if (opCode === undefined) {
    throw new UserError(
      `Type error. Operator '${
        expr.op
      }' type error. Expected ${arityMatchingOpCodes
        .map((x) => expectedTypesAsStrings(x).join(", "))
        .join(" or ")} but got [${expr.args
        .map((x) => toString(getType(x, program)))
        .join(", ")}].`,
      expr,
    );
  }

  if (expr.op === (".." as any) && legacyDotDot.includes(opCode)) {
    addWarning(
      new UserError(
        `Deprecated alias .. used. Use ${opCode} or + instead.`,
        expr,
      ),
    );
  }
  const got = opArgsWithDefaults(opCode, expr.args).map((x) =>
    getType(x, program),
  );

  return { type: getOpCodeTypeFromTypes(opCode, got), opCode };
}

export function getArithmeticType(
  op: PhysicalOpCode,
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
        const larger = lt(left, right) ? right : left;
        const lim = 2n ** BigInt(larger.toString(2).length);
        if (lt(-1n, a.low) && lt(-1n, b.low)) return int(0n, lim);
        return int(neg(lim), lim);
      }
      return int();
    }
  }
  throw new InvariantError(`Type error. Unknown opcode. ${op ?? "null"}`);
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
  throw new InvariantError("Type error. Node is not a collection.");
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
