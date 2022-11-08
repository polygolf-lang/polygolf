import { joinGroups } from "../../common/emit";
import { block, Expr, IR, toString } from "../../IR";

export default function emitProgram(program: IR.Program): string[] {
  return emitExpr(program.body, true);
}

function emitExpr(expr: Expr, asStatement = false): string[] {
  function emitSexpr(op: string, ...args: (string | Expr)[]): string[] {
    if (op === "@") op += expr.type;
    if (asStatement) {
      return [
        op,
        ...joinGroups(
          args.map((x) => (typeof x === "string" ? [x] : emitExpr(x)))
        ),
        ";",
      ];
    }
    return [
      "(",
      op,
      ...joinGroups(
        args.map((x) => (typeof x === "string" ? [x] : emitExpr(x)))
      ),
      ")",
      ...(expr.valueType === undefined ? [] : [":", toString(expr.valueType)]),
    ];
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
      return [
        "{",
        ...joinGroups(
          expr.variants.map((x) => emitExpr(x, true)),
          "/"
        ),
        "}",
      ];
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
      return emitSexpr(
        "while",
        expr.condition,
        "$INDENT$",
        "\n",
        expr.body,
        "$DEDENT$"
      );
    case "ForRange":
      if (expr.inclusive) {
        return emitSexpr(
          "@ForRangeInclusive",
          expr.variable,
          expr.low,
          expr.high,
          expr.increment,
          "$INDENT$",
          "\n",
          expr.body,
          "$DEDENT$"
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
        "$INDENT$",
        "\n",
        expr.body,
        "$DEDENT$"
      );
    case "ForEach":
      return emitSexpr("@", expr.variable, expr.collection, expr.body);
    case "ForEachKey":
      return emitSexpr("@", expr.variable, expr.table, expr.body);
    case "ForEachPair":
      return emitSexpr(
        "@",
        expr.keyVariable,
        expr.valueVariable,
        expr.table,
        expr.body
      );
    case "ForCLike":
      return emitSexpr("@", expr.init, expr.condition, expr.append, expr.body);
    case "IfStatement":
      return emitSexpr(
        "if",
        expr.condition,
        "$INDENT$",
        "\n",
        expr.consequent,
        "$DEDENT$",
        ...(expr.alternate === undefined
          ? []
          : ["$INDENT$", "\n", expr.alternate, "$DEDENT$"])
      );
  }
}
