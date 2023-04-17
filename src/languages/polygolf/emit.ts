import { TokenTree } from "@/common/Language";
import { joinTrees } from "../../common/emit";
import { block, Expr, IR, toString, variants, Variants } from "../../IR";

export default function emitProgram(program: IR.Program): TokenTree {
  return emitExpr(program.body, true);
}

function emitVariants(expr: Variants, indent = false): TokenTree {
  if (indent || expr.variants.some((x) => x.kind === "Block")) {
    return [
      "{",
      "$INDENT$",
      "\n",
      joinTrees(
        ["$DEDENT$", "\n", "/", "$INDENT$", "\n"],
        expr.variants.map((x) => emitExpr(x, true))
      ),
      "$DEDENT$",
      "\n",
      "}",
    ];
  }
  return [
    "{",
    joinTrees(
      "/",
      expr.variants.map((x) => emitExpr(x, true))
    ),
    "}",
  ];
}

export function emitExpr(
  expr: Expr,
  asStatement = false,
  indent = false
): TokenTree {
  function emitSexpr(op: string, ...args: (TokenTree | Expr)[]): TokenTree {
    const isNullary = ["argv", "argc", "true", "false"].includes(op);
    if (op === "@") op += expr.kind;
    const result: TokenTree = [];
    if (!asStatement && !isNullary) result.push("(");
    if (indent) result.push("$INDENT$", "\n");
    if (opAliases[op] !== undefined && args.length === 2) {
      let a = args[0];
      result.push(typeof a === "string" || !("kind" in a) ? a : emitExpr(a));
      result.push(opAliases[op]);
      a = args[1];
      result.push(typeof a === "string" || !("kind" in a) ? a : emitExpr(a));
    } else {
      op = opAliases[op] ?? op;
      result.push(op);
      result.push(
        joinTrees(
          [],
          args.map((x) =>
            typeof x === "string" || !("kind" in x) ? [x] : emitExpr(x)
          )
        )
      );
    }
    if (asStatement) {
      result.push(";");
    } else {
      if (indent) result.push("$DEDENT$", "\n");
      if (!isNullary) result.push(")");
      if (expr.type !== undefined) result.push(":", toString(expr.type));
    }
    return result;
  }
  switch (expr.kind) {
    case "Block":
      return joinTrees(
        "\n",
        expr.children.map((x) => emitExpr(x, true))
      );
    case "Variants":
      return emitVariants(expr, indent);
    case "KeyValue":
      return emitSexpr("key_value", expr.key, expr.value);
    case "PolygolfOp":
      return emitSexpr(expr.op, ...expr.args);
    case "VarDeclaration":
      return emitSexpr("@", expr.variable, toString(expr.variableType));
    case "VarDeclarationBlock":
      return emitSexpr("@", ...expr.children.map((x) => emitExpr(x)));
    case "VarDeclarationWithAssignment":
      return emitSexpr("@", expr.assignment);
    case "Assignment":
      return emitSexpr("assign", expr.variable, expr.expr);
    case "Function":
      return emitSexpr("func", ...expr.args, expr.expr);
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
      if (expr.ident.builtin) {
        return emitSexpr(
          "@",
          expr.op ?? "?",
          ...emitExpr(expr.ident),
          ...expr.args
        );
      }
      return emitSexpr("$" + expr.ident.name, ...expr.args);
    case "MethodCall":
      return emitSexpr(
        "@",
        expr.op ?? "?",
        ...emitExpr(expr.ident),
        expr.object,
        ...expr.args
      );
    case "BinaryOp":
      return emitSexpr("@", expr.op ?? "?", expr.name, expr.left, expr.right);
    case "UnaryOp":
      return emitSexpr("@", expr.op ?? "?", expr.name, expr.arg);
    case "Identifier":
      if (expr.builtin) {
        return emitSexpr("@BuiltinIdent", JSON.stringify(expr.name));
      } else {
        return [
          "$" + expr.name,
          expr.type === undefined ? [] : [":", toString(expr.type)],
        ];
      }
    case "StringLiteral":
      return JSON.stringify(expr.value);
    case "IntegerLiteral":
      return expr.value.toString();
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
      return emitSexpr(
        expr.isSafe ? "conditional" : "unsafe_conditional",
        expr.condition,
        expr.consequent,
        expr.alternate
      );
    case "ManyToManyAssignment":
      return emitSexpr(
        "@",
        variants([block(expr.variables)]),
        variants([block(expr.exprs)])
      );
    case "OneToManyAssignment":
      return emitSexpr("@", variants([block(expr.variables)]), expr.expr);
    case "ImportStatement":
      return emitSexpr(
        "@",
        ...[expr.name, ...expr.modules].map((x) => JSON.stringify(x))
      );
    case "WhileLoop":
      return emitSexpr(
        "while",
        expr.condition,
        ...emitExpr(expr.body, false, true)
      );
    case "ForRange":
      if (expr.inclusive) {
        return emitSexpr(
          "@ForRangeInclusive",
          expr.variable,
          expr.start,
          expr.end,
          expr.increment,
          ...emitExpr(expr.body, false, true)
        );
      }
      return emitSexpr(
        "for",
        expr.variable,
        expr.start,
        expr.end,
        ...(expr.increment.kind === "IntegerLiteral" &&
        expr.increment.value === 1n
          ? []
          : [expr.increment]),
        ...emitExpr(expr.body, false, true)
      );
    case "ForDifferenceRange":
      return emitSexpr(
        "@ForDifferenceRange",
        expr.variable,
        expr.start,
        expr.difference,
        expr.increment,
        ...emitExpr(expr.body, false, true)
      );
    case "ForEach":
      return emitSexpr(
        "@",
        expr.variable,
        expr.collection,
        ...emitExpr(expr.body, false, true)
      );
    case "ForArgv":
      return emitSexpr(
        "for_argv",
        expr.variable,
        expr.argcUpperBound.toString(),
        ...emitExpr(expr.body, false, true)
      );
    case "ForEachKey":
      return emitSexpr(
        "@",
        expr.variable,
        expr.table,
        ...emitExpr(expr.body, false, true)
      );
    case "ForEachPair":
      return emitSexpr(
        "@",
        expr.keyVariable,
        expr.valueVariable,
        expr.table,
        ...emitExpr(expr.body, false, true)
      );
    case "ForCLike":
      return emitSexpr(
        "@",
        expr.init,
        expr.condition,
        expr.append,
        ...emitExpr(expr.body, false, true)
      );
    case "IfStatement":
      return emitSexpr(
        "if",
        expr.condition,
        ...emitExpr(expr.consequent, false, true),
        ...(expr.alternate === undefined
          ? []
          : [...emitExpr(expr.alternate, false, true)])
      );
    case "NamedArg":
      return emitSexpr("@", JSON.stringify(expr.name), ...emitExpr(expr.value));
  }
}

const opAliases: Record<string, string> = {
  add: "+",
  neg: "-",
  sub: "-",
  mul: "*",
  pow: "^",
  bit_and: "&",
  bit_or: "|",
  bit_xor: "~",
  bit_not: "~",
  bit_shift_left: "<<",
  bit_shift_right: ">>",
  eq: "==",
  neq: "!=",
  leq: "<=",
  lt: "<",
  geq: ">=",
  gt: ">",
  list_length: "#",
  concat: "..",
  assign: "<-",
  key_value: "=>",
  mod: "mod",
  div: "div",
};
