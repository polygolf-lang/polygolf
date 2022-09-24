import {
  Program,
  Expr,
  ValueType,
  listType,
  simpleType,
  arrayType,
  BinaryOp,
  UnaryOp,
  FunctionCall,
  MethodCall,
  integerType,
  integerTypeIncludingAll,
  IntegerType,
} from "../IR";

export function getType(expr: Expr, program: Program): ValueType {
  if (expr.valueType === undefined) {
    expr.valueType = calcType(expr, program);
  }
  return expr.valueType;
}

export function calcType(expr: Expr, program: Program): ValueType {
  switch (expr.type) {
    case "Argv":
      return listType("string");
    case "VarDeclaration":
      return simpleType("void");
    case "Assignment":
      return getType(expr.expr, program);
    case "Print":
      return simpleType("void");
    case "FunctionCall":
    case "MethodCall":
    case "BinaryOp":
    case "UnaryOp":
      return getOpCodeType(expr, program);
    case "Identifier":
      if (program.variables.has(expr.name)) {
        return program.variables.get(expr.name)!;
      }
      throw new Error(`Undeclared variable ${expr.name} encountered!`);
    case "StringLiteral":
      return simpleType("string");
    case "IntegerLiteral":
      return integerType(expr.value, expr.value);
    case "ArrayConstructor":
      return arrayType(getType(expr.exprs[0], program), expr.exprs.length);
    case "ListConstructor":
      return listType(getType(expr.exprs[0], program));
    case "StringGetByte":
      return simpleType("string");
    case "TableGet": {
      const tableType = getType(expr.table, program);
      if (tableType.type !== "Table") {
        throw new Error("TableGet must be used on a table");
      }
      return tableType.value;
    }
    case "TableSet":
      return simpleType("void");
    case "ArrayGet": {
      const arrType = getType(expr.array, program);
      if (arrType.type !== "Array") {
        throw new Error("ArrayGet must be used on a table");
      }
      return arrType.member;
    }
    case "ArraySet":
      return simpleType("void");
    case "ListGet": {
      const listType = getType(expr.list, program);
      if (listType.type !== "List") {
        throw new Error("ListGet must be used on a table");
      }
      return listType.member;
    }
    case "ListSet":
      return simpleType("void");
    case "ListPush":
      return simpleType("void");
    case "MutatingBinaryOp":
      return simpleType("void");
    case "ConditionalOp":
      return getType(expr.consequent, program);
    case "ManyToManyAssignment":
      return simpleType("void");
    case "ImportStatement":
      return simpleType("void");
    case "OneToManyAssignment":
      return getType(expr.expr, program);
  }
}

function getOpCodeType(
  expr: BinaryOp | UnaryOp | FunctionCall | MethodCall,
  program: Program
): ValueType {
  switch (expr.op) {
    case "add":
    case "sub":
    case "mul":
    case "div":
    case "mod":
    case "rem":
    case "exp":
    case "bitand":
    case "bitor":
    case "bitxor":
    case "bitnot":
    case "neg":
    case "str_to_int":
    case "cardinality":
    case "str_length":
      return getIntegerOpCodeType(expr, program);
    case "lt":
    case "leq":
    case "eq":
    case "geq":
    case "gt":
    case "inarray":
    case "inlist":
    case "inmap":
    case "inset":
    case "and":
    case "or":
      return simpleType("boolean");
    case "str_concat":
    case "int_to_str":
    case "repeat":
      return simpleType("string");
    case "sorted":
      return getType(expr, program);
  }
  throw new Error(`Unknown opcode. ${expr.op}`);
}

function getIntegerOpCodeType(
  expr: BinaryOp | UnaryOp | FunctionCall | MethodCall,
  program: Program
): ValueType {
  if (expr.op === "str_to_int") return integerType();
  if (expr.op === "str_length" || expr.op === "cardinality")
    return integerType(0, 1 << 31);
  let left: ValueType | undefined;
  let right: ValueType | undefined;
  if (expr.type === "BinaryOp") {
    left = getType(expr.left, program);
    right = getType(expr.right, program);
  } else if (expr.type === "UnaryOp") {
    right = getType(expr.arg, program);
  } else if (expr.type === "FunctionCall") {
    left = getType(expr.args[0], program);
    right = getType(expr.args[1], program);
  } else if (expr.type === "MethodCall") {
    left = getType(expr.object, program);
    right = getType(expr.args[0], program);
  }
  if (right?.type !== "integer") {
    throw new Error("Unexpected type.");
  }
  switch (expr.op) {
    case "bitnot":
      return integerType(
        right.high === undefined ? undefined : -right.high - 1n,
        right.low === undefined ? undefined : -right.low + 1n
      );
    case "neg":
      return integerType(
        right.high === undefined ? undefined : -right.high,
        right.low === undefined ? undefined : -right.low
      );
  }
  if (left?.type !== "integer") {
    throw new Error("Unexpected type.");
  }
  switch (expr.op) {
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
      return getIntegerTypeUsing(left, right, floorDiv);
    case "mod":
      return getIntegerTypeMod(left, right);
    case "rem":
      return getIntegerTypeRem(left, right);
    case "exp":
      return getIntegerTypeUsing(
        left,
        (right.low ?? 1n) < 0n ? integerType(0n, right.high) : right,
        (a, b) => a ** b
      );
    case "bitand":
      return integerType();
    case "bitor":
      return integerType();
    case "bitxor":
      return integerType();
  }
  throw new Error(`Unknown opcode. ${expr.op}`);
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
  throw new Error("Node is not a collection.");
}

function floorDiv(a: bigint, b: bigint): bigint {
  const res = a / b;
  return res < 0n ? res - 1n : res;
}

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
