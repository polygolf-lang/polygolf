import { PathFragment } from "../../common/traverse";
import { IR } from "../../IR";

export default function emitProgram(program: IR.Program): string[] {
  return emitBlock(program.block, true);
}

function emitBlock(block: IR.Block, root: boolean = false): string[] {
  if (block.requiresBlock) {
    if (root) {
      return joinGroups(
        block.children.map((stmt) => emitStatement(stmt, block)),
        "\n"
      );
    }
    return [
      "$INDENT$",
      "\n",
      ...joinGroups(
        block.children.map((stmt) => emitStatement(stmt, block)),
        "\n"
      ),
      "$DEDENT$",
      "\n",
    ];
  }
  return joinGroups(
    block.children.map((stmt) => emitStatement(stmt, block)),
    ";"
  );
}

function emitStatement(stmt: IR.Statement, parent: IR.Block): string[] {
  switch (stmt.type) {
    case "VarDeclarationWithAssignment":
      if (stmt.requiresBlock) {
        const variables =
          stmt.assignments.type === "Assignment"
            ? [stmt.assignments.variable]
            : stmt.assignments.variables;
        const exprs =
          stmt.assignments.type === "Assignment"
            ? [stmt.assignments.expr]
            : stmt.assignments.exprs;

        return [
          "var",
          "$INDENT$",
          "\n",
          ...joinGroups(
            variables.map((v, i) => [
              v.name,
              "=",
              ...emitExprNoParens(exprs[i]),
            ]),
            "\n"
          ),
          "$DEDENT$",
        ];
      }
      return ["var", ...emitExprNoParens(stmt.assignments)];
    case "ImportStatement":
      return [
        stmt.name,
        ...joinGroups(
          stmt.modules.map((x) => [x]),
          ","
        ),
      ];
    case "WhileLoop":
      return [
        `while`,
        ...emitExpr(stmt.condition, stmt),
        ":",
        ...emitBlock(stmt.body),
      ];
    case "ForRange": {
      const increment = emitExpr(stmt.increment, stmt);
      if (increment.length === 1 && increment[0] === "1") {
        return [
          "for",
          ...emitExpr(stmt.variable, stmt),
          "in",
          ...emitExpr(stmt.low, stmt),
          stmt.inclusive ? ".." : "..<",
          ...emitExpr(stmt.high, stmt),
          ":",
          ...emitBlock(stmt.body),
        ];
      }
      if (!stmt.inclusive) {
        throw new Error("Ranges with steps must be inclusive in Nim.");
      }
      return [
        "for",
        ...emitExpr(stmt.variable, stmt),
        "in",
        "countup",
        "(",
        ...emitExpr(stmt.low, stmt),
        ",",
        ...emitExpr(stmt.high, stmt),
        ",",
        ...emitExpr(stmt.increment, stmt),
        ")",
        ":",
        ...emitBlock(stmt.body),
      ];
    }
    case "IfStatement":
      return [
        "if",
        ...emitExpr(stmt.condition, stmt),
        ":",
        ...emitBlock(stmt.consequent),
        ...(stmt.alternate.children.length > 0
          ? ["else", ":", ...emitBlock(stmt.alternate)]
          : []),
      ];
    case "Variants":
      throw new Error("Variants should have been instantiated.");
    case "ForEach":
    case "ForEachKey":
    case "ForEachPair":
    case "ForCLike":
      throw new Error(`Unexpected node (${stmt.type}) while emitting Nim`);
    default:
      return emitExpr(stmt, parent);
  }
}

function emitExpr(
  expr: IR.Expr,
  parent: IR.Node,
  fragment?: PathFragment
): string[] {
  const inner = emitExprNoParens(expr);
  return needsParens(expr, parent, fragment) ? ["(", ...inner, ")"] : inner;
}

/**
 * Does expr need parens around it to override precedence?
 * This does not include needing parens for stuff like function calls
 */
function needsParens(
  expr: IR.Expr,
  parent: IR.Node,
  fragment?: PathFragment
): boolean {
  if (parent.type === "UnaryOp") {
    return expr.type === "BinaryOp" && expr.precedence <= parent.precedence;
  } else if (parent.type === "BinaryOp" && expr.type === "BinaryOp") {
    if (fragment === undefined) return true;
    if (fragment === "right") {
      if (expr.rightAssociative) return expr.precedence < parent.precedence;
      return expr.precedence <= parent.precedence;
    }
    if (expr.rightAssociative) return expr.precedence <= parent.precedence;
    return expr.precedence < parent.precedence;
  }
  if (parent.type === "MethodCall" && fragment === "object") {
    return expr.type === "UnaryOp" || expr.type === "BinaryOp";
  }
  return false;
}

function joinGroups(groups: string[][], ...sep: string[]): string[] {
  return groups.flatMap((x, i) => (i > 0 ? [...sep, ...x] : x));
}

function emitExprNoParens(expr: IR.Expr): string[] {
  switch (expr.type) {
    case "Assignment":
      return [
        ...emitExpr(expr.variable, expr),
        "=",
        ...emitExpr(expr.expr, expr),
      ];
    case "ManyToManyAssignment":
      return [
        "(",
        ...joinGroups(
          expr.variables.map((v) => [v.name]),
          ","
        ),
        ")",
        "=",
        "(",
        ...joinGroups(expr.exprs.map(emitExprNoParens), ","),
        ")",
      ];
    case "MutatingBinaryOp":
      return [
        ...emitExpr(expr.variable, expr),
        expr.name + "=",
        ...emitExpr(expr.right, expr),
      ];
    case "Identifier":
      return [expr.name];
    case "StringLiteral":
      // TODO: special string handling
      return [JSON.stringify(expr.value)];
    case "IntegerLiteral":
      return [expr.value.toString()];
    case "FunctionCall":
      return [
        expr.name,
        "(",
        ...joinGroups(
          expr.args.map((arg) => emitExpr(arg, expr)),
          ","
        ),
        ")",
      ];
    case "MethodCall":
      return [
        ...emitExpr(expr.object, expr),
        ".",
        expr.name,
        "(",
        ...joinGroups(
          expr.args.map((arg) => emitExpr(arg, expr)),
          ","
        ),
        ")",
      ];
    case "BinaryOp":
      return [
        ...emitExpr(expr.left, expr, "left"),
        expr.name,
        ...emitExpr(expr.right, expr, "right"),
      ];
    case "UnaryOp":
      return [expr.name, ...emitExpr(expr.arg, expr)];
    case "ArrayGet":
      return [
        ...emitExpr(expr.array, expr),
        "[",
        ...emitExpr(expr.index, expr),
        "]",
      ];
    case "StringGetByte":
      return [
        ...emitExpr(expr.string, expr),
        "[",
        ...emitExpr(expr.index, expr),
        "]",
      ];
    case "Print":
      return expr.newline
        ? ["echo", "(", ...emitExpr(expr.value, expr), ")"]
        : ["stdout", ".", "write", "(", ...emitExpr(expr.value, expr), ")"];
    case "ListConstructor":
      return [
        "@",
        "[",
        ...joinGroups(expr.exprs.map(emitExprNoParens), ","),
        "]",
      ];
    case "ListGet":
      if (expr.oneIndexed)
        throw new Error("Nim only supports zeroIndexed access.");
      return [
        ...emitExprNoParens(expr.list),
        "[",
        ...emitExprNoParens(expr.index),
        "]",
      ];

    default:
      throw new Error(`Unexpected node while emitting Nim: ${expr.type}. `);
  }
}
