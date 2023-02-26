import { PathFragment } from "../../common/fragments";
import {
  EmitError,
  emitStringLiteral,
  joinTrees,
  needsParensPrecedence,
} from "../../common/emit";
import { IR, isIntLiteral } from "../../IR";
import { TokenTree } from "@/common/Language";

function precedence(expr: IR.Expr): number {
  switch (expr.kind) {
    case "UnaryOp":
      return 11;
    case "BinaryOp":
      return binaryPrecedence(expr.name);
  }
}

function binaryPrecedence(opname: string): number {
  switch (opname) {
    case "^":
      return 12;
    case "*":
    case "//":
    case "%":
      return 10;
    case "+":
    case "-":
      return 9;
    case "..":
      return 8;
    case "<<":
    case ">>":
      return 7;
    case "&":
      return 6;
    case "~":
      return 5;
    case "|":
      return 4;
    case "<":
    case "<=":
    case "==":
    case "~=":
    case ">=":
    case ">":
      return 3;
    case "and":
      return 2;
    case "or":
      return 1;
  }
  throw new Error(
    `Programming error - unknown Lua binary operator '${opname}.'`
  );
}

export default function emitProgram(program: IR.Program): TokenTree {
  return emitStatement(program.body, program);
}

function emitBlock(block: IR.Block): TokenTree {
  return joinTrees(
    block.children.map((stmt) => emitStatement(stmt, block)),
    "\n"
  );
}

function emitStatement(stmt: IR.Expr, parent: IR.Node): TokenTree {
  switch (stmt.kind) {
    case "Block":
      return emitBlock(stmt);
    case "WhileLoop":
      return [
        `while`,
        emitExpr(stmt.condition, stmt),
        "do",
        emitStatement(stmt.body, stmt),
        "end",
      ];
    case "OneToManyAssignment":
      return [
        joinTrees(
          stmt.variables.map((x) => emitExprNoParens(x)),
          ","
        ),
        "=",
        emitExprNoParens(stmt.expr),
      ];
    case "ManyToManyAssignment":
      return [
        joinTrees(
          stmt.variables.map((x) => emitExprNoParens(x)),
          ","
        ),
        "=",
        joinTrees(stmt.exprs.map(emitExprNoParens), ","),
      ];
    case "ForRange": {
      if (!stmt.inclusive) throw new EmitError(stmt, "exclusive");
      return [
        "for",
        emitExpr(stmt.variable, stmt),
        "=",
        emitExpr(stmt.low, stmt),
        ",",
        emitExpr(stmt.high, stmt),
        isIntLiteral(stmt.increment, 1n)
          ? []
          : [",", emitExpr(stmt.increment, stmt)],
        "do",
        emitStatement(stmt.body, stmt),
        "end",
      ];
    }
    case "IfStatement":
      return [
        "if",
        emitExpr(stmt.condition, stmt),
        "then",
        emitStatement(stmt.consequent, stmt),
        stmt.alternate !== undefined
          ? ["else", emitStatement(stmt.alternate, stmt)]
          : [],
        "end",
      ];
    case "Variants":
    case "ForEach":
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
  const inner = emitExprNoParens(expr);
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
  if (
    ((parent.kind === "MethodCall" && expr === parent.object) ||
      (parent.kind === "IndexCall" && expr === parent.collection)) &&
    expr.kind !== "Identifier" &&
    expr.kind !== "IndexCall"
  )
    return true;
  return false;
}

function emitExprNoParens(expr: IR.Expr): TokenTree {
  switch (expr.kind) {
    case "Assignment":
      return [emitExpr(expr.variable, expr), "=", emitExpr(expr.expr, expr)];
    case "Identifier":
      return [expr.name];
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
          `'`,
          [
            [`\\`, `\\\\`],
            [`\n`, `\\n`],
            [`\r`, `\\r`],
            [`'`, `\\'`],
          ],
        ],
        [
          [`[[`, `]]`],
          [
            [`[[`, null],
            [`]]`, null],
          ],
        ],
      ]);
    case "IntegerLiteral":
      return [expr.value.toString()];
    case "FunctionCall":
      return [
        expr.ident.name,
        "(",
        joinTrees(
          expr.args.map((arg) => emitExpr(arg, expr)),
          ","
        ),
        ")",
      ];
    case "MethodCall":
      return [
        emitExpr(expr.object, expr),
        ":",
        expr.ident.name,
        "(",
        joinTrees(
          expr.args.map((arg) => emitExpr(arg, expr)),
          ","
        ),
        ")",
      ];
    case "BinaryOp":
      return [
        emitExpr(expr.left, expr, "left"),
        expr.name,
        emitExpr(expr.right, expr, "right"),
      ];
    case "UnaryOp":
      return [expr.name, emitExpr(expr.arg, expr)];
    case "IndexCall":
      if (!expr.oneIndexed) throw new EmitError(expr, "zero indexed");
      return [
        emitExpr(expr.collection, expr),
        "[",
        emitExpr(expr.index, expr),
        "]",
      ];
    case "ListConstructor":
    case "ArrayConstructor":
      return ["{", joinTrees(expr.exprs.map(emitExprNoParens), ","), "}"];

    default:
      throw new EmitError(expr);
  }
}
