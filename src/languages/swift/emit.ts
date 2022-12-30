import {
  emitStringLiteral,
  joinGroups,
  needsParensPrecedence,
} from "../../common/emit";
import { PathFragment } from "../../common/traverse";
import { IR } from "../../IR";

export default function emitProgram(program: IR.Program): string[] {
  return emitStatement(program.body, program);
}

function emitBlock(block: IR.Expr, parent: IR.Node): string[] {
  const children = block.kind === "Block" ? block.children : [block];
  if (parent.kind === "Program") {
    return joinGroups(
      children.map((stmt) => emitStatement(stmt, block)),
      "\n"
    );
  }
  return [
    "{",
    ...joinGroups(
      children.map((stmt) => emitStatement(stmt, block)),
      "\n"
    ),
    "}",
  ];
}

function emitStatement(stmt: IR.Expr, parent: IR.Node): string[] {
  switch (stmt.kind) {
    case "VarDeclarationWithAssignment":
      const variables =
        stmt.assignments.kind === "Assignment"
          ? [stmt.assignments.variable]
          : stmt.assignments.variables;
      const exprs =
        stmt.assignments.kind === "Assignment"
          ? [stmt.assignments.expr]
          : stmt.assignments.exprs;

      return [
        "var",
        ...joinGroups(
          variables.map((v, i) => [
            ...emitExprNoParens(v),
            "=",
            ...emitExprNoParens(exprs[i]),
          ]),
          ","
        ),
      ];
    case "Block":
      return emitBlock(stmt, parent);
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
        ...emitBlock(stmt.body, stmt),
      ];
    case "ForRange": {
      const low = emitExpr(stmt.low, stmt);
      const high = emitExpr(stmt.high, stmt);
      const increment = emitExpr(stmt.increment, stmt);
      const increment1 = increment.length === 1 && increment[0] === "1";
      return [
        "for",
        ...emitExpr(stmt.variable, stmt),
        "in",
        ...(increment1
          ? [...low, "..<", ...high]
          : [
              "stride",
              "(",
              ...joinGroups(
                [
                  ["from:", ...low],
                  ["to:", ...high],
                  ["by:", ...increment],
                ],
                ","
              ),
              ")",
            ]),
        ...emitBlock(stmt.body, stmt),
      ];
    }
    case "IfStatement":
      return [
        "if",
        ...emitExpr(stmt.condition, stmt),
        ...emitBlock(stmt.consequent, stmt),
        ...(stmt.alternate !== undefined
          ? ["else", ...emitBlock(stmt.alternate, stmt)]
          : []),
      ];
    case "Variants":
      throw new Error("Variants should have been instantiated.");
    case "ForEach":
    case "ForEachKey":
    case "ForEachPair":
    case "ForCLike":
      throw new Error(`Unexpected node (${stmt.kind}) while emitting Swift`);
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
  if (needsParensPrecedence(expr, parent, fragment)) {
    return true;
  }
  if (parent.kind === "MethodCall" && fragment === "object") {
    return expr.kind === "UnaryOp" || expr.kind === "BinaryOp";
  }
  return false;
}

function emitExprNoParens(expr: IR.Expr): string[] {
  switch (expr.kind) {
    case "Assignment":
      return [
        ...emitExpr(expr.variable, expr),
        "=",
        ...emitExpr(expr.expr, expr),
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
      return emitStringLiteral(expr.value, [
        [
          `"`,
          [
            [`\\`, `\\\\`],
            [`\u{1}`, `\\u{1}`],
            [`\u{2}`, `\\u{2}`],
            [`\u{3}`, `\\u{3}`],
            [`\u{4}`, `\\u{4}`],
            [`\u{5}`, `\\u{5}`],
            [`\u{6}`, `\\u{6}`],
            [`\u{7}`, `\\u{7}`],
            [`\u{8}`, `\\u{8}`],
            [`\u{9}`, `\\u{9}`],
            [`\u{a}`, `\\n`],
            [`\u{b}`, `\\u{b}`],
            [`\u{c}`, `\\u{c}`],
            [`\u{d}`, `\\u{d}`],
            [`\u{e}`, `\\u{e}`],
            [`\u{f}`, `\\u{f}`],
            [`\u{10}`, `\\u{10}`],
            [`\u{11}`, `\\u{11}`],
            [`\u{12}`, `\\u{12}`],
            [`\u{13}`, `\\u{13}`],
            [`\u{14}`, `\\u{14}`],
            [`\u{15}`, `\\u{15}`],
            [`\u{16}`, `\\u{16}`],
            [`\u{17}`, `\\u{17}`],
            [`\u{18}`, `\\u{18}`],
            [`\u{19}`, `\\u{19}`],
            [`\u{1a}`, `\\u{1a}`],
            [`\u{1b}`, `\\u{1b}`],
            [`\u{1c}`, `\\u{1c}`],
            [`\u{1d}`, `\\u{1d}`],
            [`\u{1e}`, `\\u{1e}`],
            [`\u{1f}`, `\\u{1f}`],

            [`"`, `\\"`],
          ],
        ],
        [
          `"""`,
          [
            [`\\`, `\\\\`],
            [`\u{1}`, `\\u{1}`],
            [`\u{2}`, `\\u{2}`],
            [`\u{3}`, `\\u{3}`],
            [`\u{4}`, `\\u{4}`],
            [`\u{5}`, `\\u{5}`],
            [`\u{6}`, `\\u{6}`],
            [`\u{7}`, `\\u{7}`],
            [`\u{8}`, `\\u{8}`],
            [`\u{9}`, `\\u{9}`],

            [`\u{b}`, `\\u{b}`],
            [`\u{c}`, `\\u{c}`],
            [`\u{d}`, `\\u{d}`],
            [`\u{e}`, `\\u{e}`],
            [`\u{f}`, `\\u{f}`],
            [`\u{10}`, `\\u{10}`],
            [`\u{11}`, `\\u{11}`],
            [`\u{12}`, `\\u{12}`],
            [`\u{13}`, `\\u{13}`],
            [`\u{14}`, `\\u{14}`],
            [`\u{15}`, `\\u{15}`],
            [`\u{16}`, `\\u{16}`],
            [`\u{17}`, `\\u{17}`],
            [`\u{18}`, `\\u{18}`],
            [`\u{19}`, `\\u{19}`],
            [`\u{1a}`, `\\u{1a}`],
            [`\u{1b}`, `\\u{1b}`],
            [`\u{1c}`, `\\u{1c}`],
            [`\u{1d}`, `\\u{1d}`],
            [`\u{1e}`, `\\u{1e}`],
            [`\u{1f}`, `\\u{1f}`],
            [`"""`, `\\"""`],
          ],
        ],
      ]);
    case "IntegerLiteral":
      return [expr.value.toString()];
    case "FunctionCall":
      return [
        expr.ident.name,
        "(",
        ...joinGroups(
          expr.op === "repeat"
            ? [
                ["repeating:", ...emitExpr(expr.args[0], expr)],
                ["count:", ...emitExpr(expr.args[1], expr)],
              ]
            : expr.op === "print"
            ? [[...emitExpr(expr.args[0], expr)], ["terminator:", '""']]
            : expr.args.map((arg) => emitExpr(arg, expr)),
          ","
        ),
        ")",
        expr.op === "text_to_int" ? "!" : "",
      ];
    case "MethodCall":
      if (expr.ident.name === "utf8" || expr.ident.name == "count") {
        return [...emitExpr(expr.object, expr), ".", expr.ident.name];
      }
      return [
        ...emitExpr(expr.object, expr),
        ".",
        expr.ident.name,
        "(",
        ...joinGroups(
          expr.op === "text_split"
            ? [["separator:", ...emitExpr(expr.args[0], expr)]]
            : expr.args.map((arg) => emitExpr(arg, expr)),
          ","
        ),
        ")",
      ];
    case "BinaryOp":
      return [
        ...emitExpr(expr.left, expr, "left"),
        ...(expr.op === "neq" // `!=` needs spaces on both sides in Swift
          ? ["", expr.name, ""]
          : expr.name),
        ...emitExpr(expr.right, expr, "right"),
      ];
    case "UnaryOp":
      return [expr.name, ...emitExpr(expr.arg, expr)];
    case "ListConstructor":
      return [
        "[",
        ...joinGroups(
          expr.exprs.map((x) => emitExprNoParens(x)),
          ","
        ),
        "]",
      ];
    case "IndexCall":
      return [
        ...emitExprNoParens(expr.collection),
        "[",
        ...emitExprNoParens(expr.index),
        "]",
      ];

    default:
      throw new Error(
        `Unexpected node while emitting Swift: ${expr.kind}: ${
          "op" in expr ? expr.op ?? "" : ""
        }. `
      );
  }
}
