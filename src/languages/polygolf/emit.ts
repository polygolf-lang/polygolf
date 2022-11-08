import { joinGroups } from "../../common/emit";
import { block, Expr, IR, toString, Variants } from "../../IR";

export default function emitProgram(program: IR.Program): string[] {
  return emitExpr(program.body, true);
}

function emitVariants(expr: Variants, indent = false): string[] {
  if (indent) {
    return [
      "{",
      "$INDENT$",
      "\n",
      ...joinGroups(
        expr.variants.map((x) => emitExpr(x, true)),
        "/"
      ),
      "\n",
      "$DEDENT$",
      "}",
    ];
  }
  return [
    "{",
    ...joinGroups(
      expr.variants.map((x) => emitExpr(x, true)),
      "/"
    ),
    "}",
  ];
}

function emitExpr(expr: Expr, asStatement = false): string[] {
  function emitSexpr(op: string, ...args: (string | Expr)[]): string[] {
    if (op === "@") op += expr.type;
    const result: string[] = [];
    if (!asStatement) result.push("(");
    if (opAliases[op] !== undefined && args.length === 2) {
      result.push(
        ...(typeof args[0] === "string" ? [args[0]] : emitExpr(args[0]))
      );
      result.push(opAliases[op]);
      result.push(
        ...(typeof args[1] === "string" ? [args[1]] : emitExpr(args[1]))
      );
    } else {
      op = opAliases[op] ?? op;
      result.push(op);
      result.push(
        ...joinGroups(
          args.map((x) => (typeof x === "string" ? [x] : emitExpr(x)))
        )
      );
    }
    if (asStatement) {
      result.push(";");
    } else {
      result.push(")");
      if (expr.valueType !== undefined)
        result.push(":", toString(expr.valueType));
    }
    return result;
  }
  function emitIndent(expr: Expr): (string | Expr)[] {
    if (expr.type === "Variants") return emitVariants(expr, true);
    return ["$INDENT$", "\n", expr, "$DEDENT$"];
  }
  switch (expr.type) {
    case "Block":
      return [
        ...joinGroups(
          expr.children.map((x) => emitExpr(x, true)),
          "\n"
        ),
      ];
    case "Variants":
      return emitVariants(expr);
    case "KeyValue":
      return emitSexpr("key_value", expr.key, expr.value);
    case "PolygolfOp":
      return emitSexpr(expr.op, ...expr.args);
    case "VarDeclaration":
      return emitSexpr("@", expr.variable, toString(expr.variableType));
    case "VarDeclarationWithAssignment":
      return emitSexpr(
        "@",
        expr.assignments,
        "{" + (expr.valueTypes ?? []).map(toString).join(" ") + "}"
      );
    case "Assignment":
      return emitSexpr("assign", expr.variable, expr.expr);
    case "IndexCall":
      return emitSexpr(
        "@",
        String(expr.oneIndexed),
        expr.op ?? "?",
        expr.collection,
        expr.index
      );
    case "RangeIndexCall":
      return emitSexpr(
        "@",
        String(expr.oneIndexed),
        expr.op ?? "?",
        expr.collection,
        expr.low,
        expr.high,
        expr.step
      );
    case "FunctionCall":
      return emitSexpr(
        "@",
        expr.op ?? "?",
        ...emitExpr(expr.ident),
        ...expr.args
      );
    case "MethodCall":
      return emitSexpr(
        "@",
        expr.op ?? "?",
        ...emitExpr(expr.ident),
        expr.object,
        ...expr.args
      );
    case "BinaryOp":
      return emitSexpr(
        "@",
        expr.op,
        String(expr.precedence),
        String(expr.rightAssociative),
        expr.name,
        expr.left,
        expr.right
      );
    case "UnaryOp":
      return emitSexpr(
        "@",
        expr.op,
        String(expr.precedence),
        expr.name,
        expr.arg
      );
    case "Identifier":
      if (expr.builtin) {
        return emitSexpr("@BuiltinIdent", JSON.stringify(expr.name));
      } else {
        return ["$" + expr.name];
      }
    case "StringLiteral":
      return [JSON.stringify(expr.value)];
    case "IntegerLiteral":
      return [expr.value.toString()];
    case "ArrayConstructor":
      return emitSexpr("array", ...expr.exprs);
    case "ListConstructor":
      return emitSexpr("list", ...expr.exprs);
    case "SetConstructor":
      return emitSexpr("set", ...expr.exprs);
    case "TableConstructor":
      return emitSexpr("table", ...expr.kvPairs);
    case "MutatingBinaryOp":
      return emitSexpr("@", expr.op, expr.name, expr.variable, expr.right);
    case "ConditionalOp":
      return emitSexpr("@", expr.condition, expr.consequent, expr.alternate);
    case "ManyToManyAssignment":
      return emitSexpr("@", block(expr.variables), block(expr.exprs));
    case "OneToManyAssignment":
      return emitSexpr("@", block(expr.variables), expr.expr);
    case "ImportStatement":
      return emitSexpr(
        "@",
        ...[expr.name, ...expr.modules].map((x) => JSON.stringify(x))
      );
    case "WhileLoop":
      return emitSexpr("while", expr.condition, ...emitIndent(expr.body));
    case "ForRange":
      if (expr.inclusive) {
        return emitSexpr(
          "@ForRangeInclusive",
          expr.variable,
          expr.low,
          expr.high,
          expr.increment,
          ...emitIndent(expr.body)
        );
      }
      return emitSexpr(
        "for",
        expr.variable,
        expr.low,
        expr.high,
        ...(expr.increment.type === "IntegerLiteral" &&
        expr.increment.value === 1n
          ? []
          : [expr.increment]),
        ...emitIndent(expr.body)
      );
    case "ForEach":
      return emitSexpr(
        "@",
        expr.variable,
        expr.collection,
        ...emitIndent(expr.body)
      );
    case "ForEachKey":
      return emitSexpr(
        "@",
        expr.variable,
        expr.table,
        ...emitIndent(expr.body)
      );
    case "ForEachPair":
      return emitSexpr(
        "@",
        expr.keyVariable,
        expr.valueVariable,
        expr.table,
        ...emitIndent(expr.body)
      );
    case "ForCLike":
      return emitSexpr(
        "@",
        expr.init,
        expr.condition,
        expr.append,
        ...emitIndent(expr.body)
      );
    case "IfStatement":
      return emitSexpr(
        "if",
        expr.condition,
        ...emitIndent(expr.consequent),
        ...(expr.alternate === undefined ? [] : [...emitIndent(expr.alternate)])
      );
  }
}

const opAliases: Record<string, string> = {
  add: "+",
  neg: "-",
  sub: "-",
  mul: "*",
  pow: "^",
  bit_and: "&",
  bit_or: "&",
  eq: "==",
  neq: "!=",
  leq: "<=",
  lt: "<",
  geq: ">=",
  gt: ">",
  list_length: "#",
  text_concat: "..",
  assign: "<-",
  key_value: "=>",
};
