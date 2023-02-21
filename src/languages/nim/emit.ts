import { TokenTree } from "@/common/Language";
import {
  emitStringLiteral,
  joinTrees,
  needsParensPrecedence,
  EmitError,
} from "../../common/emit";
import { PathFragment } from "../../common/fragments";
import { IR } from "../../IR";

export default function emitProgram(program: IR.Program): TokenTree {
  return emitStatement(program.body, program);
}

function emitMultiExpr(expr: IR.Expr, parent: IR.Node): TokenTree {
  const children = expr.kind === "Block" ? expr.children : [expr];
  // Prefer newlines over semicolons at top level for aesthetics
  if (parent.kind === "Program") {
    return joinTrees(
      children.map((stmt) => emitStatement(stmt, expr)),
      "\n"
    );
  }
  let inner = [];
  let needsBlock = false;
  for (const child of children) {
    const needsNewline =
      "consequent" in child || "children" in child || "body" in child;
    needsBlock =
      needsBlock || needsNewline || child.kind.startsWith("VarDeclaration");
    inner.push(emitStatement(child, expr));
    inner.push(needsNewline ? "\n" : ";");
  }
  inner = inner.slice(0, -1);
  if (needsBlock) {
    return ["$INDENT$", "\n", inner, "$DEDENT$"];
  }
  return inner;
}

function emitStatement(stmt: IR.Expr, parent: IR.Node): TokenTree {
  switch (stmt.kind) {
    case "Block":
      return emitMultiExpr(stmt, parent);
    case "VarDeclarationWithAssignment":
      if (parent.kind !== "VarDeclarationBlock")
        return ["var", emitExprNoParens(stmt.assignment)];
      return emitExprNoParens(stmt.assignment);
    case "VarDeclarationBlock":
      if (stmt.children.length > 1)
        return [
          "var",
          "$INDENT$",
          stmt.children.map((x) => ["\n", emitStatement(x, stmt)]),
          "$DEDENT$",
        ];
      return ["var", emitStatement(stmt.children[0], stmt)];
    case "ImportStatement":
      return [
        stmt.name,
        joinTrees(
          stmt.modules.map((x) => [x]),
          ","
        ),
      ];
    case "WhileLoop":
      return [
        `while`,
        emitExpr(stmt.condition, stmt),
        ":",
        emitMultiExpr(stmt.body, stmt),
      ];
    case "ForEach":
      return [
        `for`,
        emitExpr(stmt.variable, stmt),
        "in",
        emitExpr(stmt.collection, stmt),
        ":",
        emitMultiExpr(stmt.body, stmt),
      ];
    case "ForRange": {
      const low =
        stmt.low.kind === "IntegerLiteral" &&
        stmt.low.value === 0n &&
        stmt.inclusive
          ? []
          : emitExpr(stmt.low, stmt);
      if (
        stmt.increment.kind === "IntegerLiteral" &&
        stmt.increment.value === 1n
      ) {
        return [
          "for",
          emitExpr(stmt.variable, stmt),
          "in",
          low,
          "$GLUE$",
          stmt.inclusive ? ".." : "..<",
          emitExpr(stmt.high, stmt),
          ":",
          emitMultiExpr(stmt.body, stmt),
        ];
      }
      if (!stmt.inclusive) {
        throw new EmitError(stmt, "exlusive+step");
      }
      return [
        "for",
        emitExpr(stmt.variable, stmt),
        "in",
        "countup",
        "$GLUE$",
        "(",
        emitExpr(stmt.low, stmt),
        ",",
        emitExpr(stmt.high, stmt),
        ",",
        emitExpr(stmt.increment, stmt),
        ")",
        ":",
        emitMultiExpr(stmt.body, stmt),
      ];
    }
    case "IfStatement":
      return [
        "if",
        emitExpr(stmt.condition, stmt),
        ":",
        emitMultiExpr(stmt.consequent, stmt),
        stmt.alternate !== undefined
          ? ["else", ":", emitMultiExpr(stmt.alternate, stmt)]
          : [],
      ];
    case "Variants":
    case "ForEachKey":
    case "ForEachPair":
    case "ForCLike":
      throw new EmitError(stmt);
    default:
      return emitExpr(stmt, parent);
  }
}

function emitExpr(
  expr: IR.Expr,
  parent: IR.Node,
  fragment?: PathFragment
): TokenTree {
  const inner = emitExprNoParens(
    expr,
    (parent.kind === "BinaryOp" && fragment === "left") ||
      (parent.kind === "MethodCall" && fragment === "object")
  );
  return needsParens(expr, parent, fragment) ? ["(", inner, ")"] : inner;
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
  if (needsParensPrecedence(expr, parent, fragment)) {
    return true;
  }
  if (parent.kind === "MethodCall" && fragment === "object") {
    return expr.kind === "UnaryOp" || expr.kind === "BinaryOp";
  }
  return false;
}

function emitExprNoParens(
  expr: IR.Expr,
  expressionContinues: boolean = false
): TokenTree {
  switch (expr.kind) {
    case "Assignment":
      return [emitExpr(expr.variable, expr), "=", emitExpr(expr.expr, expr)];
    case "ManyToManyAssignment":
      return [
        "(",
        joinTrees(
          expr.variables.map((v) => emitExprNoParens(v)),
          ","
        ),
        ")",
        "=",
        "(",
        joinTrees(
          expr.exprs.map((x) => emitExprNoParens(x)),
          ","
        ),
        ")",
      ];
    case "OneToManyAssignment":
      return [
        joinTrees(
          expr.variables.map((v) => emitExprNoParens(v)),
          ","
        ),
        "=",
        emitExprNoParens(expr.expr),
      ];
    case "MutatingBinaryOp":
      return [
        emitExpr(expr.variable, expr),
        "$GLUE$",
        expr.name + "=",
        emitExpr(expr.right, expr),
      ];
    case "Identifier":
      return expr.name;
    case "StringLiteral":
      return emitStringLiteral(expr.value, [
        [
          `"`,
          [
            [`\\`, `\\\\`],
            [`\n`, `\\n`],
            [`\r`, `\\r`],
            [`"`, `\\"`],
          ],
        ],
        [
          `"""`,
          [
            [`\\`, `\\\\`],
            [`"""`, `\\"""`],
          ],
        ],
        [
          [`r"`, `"`],
          [
            [`"`, `""`],
            [`\n`, null],
            [`\r`, null],
          ],
        ],
      ]);
    case "IntegerLiteral":
      return expr.value.toString();
    case "FunctionCall":
      if (expr.args.length === 1 && expr.args[0].kind === "StringLiteral") {
        return [expr.ident.name, "$GLUE$", emitExpr(expr.args[0], expr)];
      }
      if (expressionContinues || expr.args.length > 1 || expr.args.length === 0)
        return [
          expr.ident.name,
          "$GLUE$",
          "(",
          joinTrees(
            expr.args.map((arg) => emitExpr(arg, expr)),
            ","
          ),
          ")",
        ];
      return [
        expr.ident.name,
        joinTrees(
          expr.args.map((arg) => emitExpr(arg, expr)),
          ","
        ),
      ];
    case "MethodCall":
      if (expressionContinues || expr.args.length > 1)
        return [
          emitExpr(expr.object, expr, "object"),
          ".",
          expr.ident.name,
          expr.args.length > 0
            ? [
                "$GLUE$",
                "(",
                joinTrees(
                  expr.args.map((arg) => emitExpr(arg, expr)),
                  ","
                ),
                ")",
              ]
            : [],
        ];
      else
        return [
          emitExpr(expr.object, expr, "object"),
          ".",
          expr.ident.name,
          expr.args.length > 0
            ? joinTrees(
                expr.args.map((arg) => emitExpr(arg, expr)),
                ","
              )
            : [],
        ];
    case "BinaryOp":
      return [
        emitExpr(expr.left, expr, "left"),
        /[A-Za-z]/.test(expr.name[0]) ? [] : "$GLUE$",
        expr.name,
        emitExpr(expr.right, expr, "right"),
      ];
    case "UnaryOp":
      return [expr.name, emitExpr(expr.arg, expr)];
    case "ListConstructor":
      return [
        "@",
        "[",
        joinTrees(
          expr.exprs.map((x) => emitExprNoParens(x)),
          ","
        ),
        "]",
      ];
    case "TableConstructor":
      return [
        "{",
        joinTrees(
          expr.kvPairs.map((x) => [
            emitExprNoParens(x.key),
            ":",
            emitExprNoParens(x.value),
          ]),
          ","
        ),
        "}",
        ".",
        "toTable",
      ];
    case "IndexCall":
      if (expr.oneIndexed) throw new EmitError(expr, "one indexed");
      return [
        emitExprNoParens(expr.collection),
        "[",
        emitExprNoParens(expr.index),
        "]",
      ];
    case "RangeIndexCall":
      if (expr.oneIndexed) throw new EmitError(expr, "one indexed");
      if (expr.step.kind !== "IntegerLiteral" || expr.step.value !== 1n)
        throw new EmitError(expr, "step");
      return [
        emitExprNoParens(expr.collection),
        "[",
        emitExprNoParens(expr.low),
        "..",
        emitExprNoParens(expr.high),
        "]",
      ];

    default:
      throw new EmitError(expr);
  }
}
