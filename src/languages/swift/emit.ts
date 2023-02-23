import { TokenTree } from "../../common/Language";
import {
  EmitError,
  emitStringLiteral,
  joinTrees,
  needsParensPrecedence,
} from "../../common/emit";
import { PathFragment } from "../../common/fragments";
import { IR, isIntLiteral } from "../../IR";

export default function emitProgram(program: IR.Program): TokenTree {
  return emitStatement(program.body, program);
}

function emitMultiExpr(baseExpr: IR.Expr, parent: IR.Node): TokenTree {
  const children = baseExpr.kind === "Block" ? baseExpr.children : [baseExpr];
  if (parent.kind === "Program") {
    return joinTrees(
      children.map((stmt) => emitStatement(stmt, baseExpr)),
      "\n"
    );
  }
  return [
    "{",
    joinTrees(
      children.map((stmt) => emitStatement(stmt, baseExpr)),
      "\n"
    ),
    "}",
  ];
}

function emitStatement(stmt: IR.Expr, parent: IR.Node): TokenTree {
  switch (stmt.kind) {
    case "VarDeclarationBlock":
      return [
        "var",
        joinTrees(
          stmt.children.map((v) => emitStatement(v, stmt)),
          ","
        ),
      ];
    case "VarDeclarationWithAssignment":
      return emitStatement(stmt.assignment, stmt);
    case "Block":
      return emitMultiExpr(stmt, parent);
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
        emitMultiExpr(stmt.body, stmt),
      ];
    case "ForEach":
      return [
        `for`,
        emitExpr(stmt.variable, stmt),
        "in",
        emitExpr(stmt.collection, stmt),
        emitMultiExpr(stmt.body, stmt),
      ];
    case "ForRange": {
      const low = emitExpr(stmt.low, stmt);
      const high = emitExpr(stmt.high, stmt);
      return [
        "for",
        emitExpr(stmt.variable, stmt),
        "in",
        isIntLiteral(stmt.increment, 1n)
          ? [low, stmt.inclusive ? "..." : "..<", high]
          : [
              "stride",
              "(",
              joinTrees(
                [
                  ["from:", low],
                  ["to:", high],
                  ["by:", emitExpr(stmt.increment, stmt)],
                ],
                ","
              ),
              ")",
            ],
        emitMultiExpr(stmt.body, stmt),
      ];
    }
    case "IfStatement":
      return [
        "if",
        emitExpr(stmt.condition, stmt),
        emitMultiExpr(stmt.consequent, stmt),
        stmt.alternate !== undefined
          ? ["else", emitMultiExpr(stmt.alternate, stmt)]
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
  if (expr.kind === "ConditionalOp")
    return parent.kind === "UnaryOp" || parent.kind === "BinaryOp";
  return false;
}

const unicode01to09repls: [string, string][] = [
  [`\u{1}`, `\\u{1}`],
  [`\u{2}`, `\\u{2}`],
  [`\u{3}`, `\\u{3}`],
  [`\u{4}`, `\\u{4}`],
  [`\u{5}`, `\\u{5}`],
  [`\u{6}`, `\\u{6}`],
  [`\u{7}`, `\\u{7}`],
  [`\u{8}`, `\\u{8}`],
  [`\u{9}`, `\\u{9}`],
];
const unicode0Bto1Frepls: [string, string][] = [
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
];

function emitExprNoParens(expr: IR.Expr): TokenTree {
  switch (expr.kind) {
    case "Assignment":
      return [emitExpr(expr.variable, expr), "=", emitExpr(expr.expr, expr)];
    case "MutatingBinaryOp":
      return [
        emitExpr(expr.variable, expr),
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
            ...unicode01to09repls,
            [`\u{a}`, `\\n`],
            ...unicode0Bto1Frepls,
            [`"`, `\\"`],
          ],
        ],
        [
          [`"""\n`, `\n"""`],
          [
            [`\\`, `\\\\`],
            ...unicode01to09repls,
            ...unicode0Bto1Frepls,
            [`"""`, `\\"""`],
          ],
        ],
      ]);
    case "IntegerLiteral":
      return expr.value.toString();
    case "FunctionCall":
      return [
        expr.ident.name,
        "(",
        joinTrees(
          expr.op === "repeat"
            ? [
                ["repeating:", emitExpr(expr.args[0], expr)],
                ["count:", emitExpr(expr.args[1], expr)],
              ]
            : expr.op === "print"
            ? [[emitExpr(expr.args[0], expr)], ["terminator:", '""']]
            : expr.args.map((arg) => emitExpr(arg, expr)),
          ","
        ),
        ")",
        expr.op === "text_to_int" || expr.ident.name === "UnicodeScalar"
          ? "!"
          : "",
      ];
    case "MethodCall":
      if (expr.ident.name === "utf8" || expr.ident.name === "count") {
        return [emitExpr(expr.object, expr), ".", expr.ident.name];
      }
      return [
        emitExpr(expr.object, expr),
        ".",
        expr.ident.name,
        "(",
        joinTrees(
          expr.op === "text_split"
            ? [["separator:", emitExpr(expr.args[0], expr)]]
            : expr.args.map((arg) => emitExpr(arg, expr)),
          ","
        ),
        ")",
      ];
    case "ConditionalOp":
      return [
        emitExpr(expr.condition, expr),
        "?",
        emitExpr(expr.consequent, expr),
        ":",
        emitExpr(expr.alternate, expr),
      ];
    case "BinaryOp":
      return [
        emitExpr(expr.left, expr, "left"),
        expr.name,
        emitExpr(expr.right, expr, "right"),
      ];
    case "UnaryOp":
      return [expr.name, emitExpr(expr.arg, expr)];
    case "ListConstructor":
      return [
        "[",
        joinTrees(
          expr.exprs.map((x) => emitExprNoParens(x)),
          ","
        ),
        "]",
      ];
    case "TableConstructor":
      return [
        "[",
        joinTrees(
          expr.kvPairs.map((x) => [
            emitExprNoParens(x.key),
            ":",
            emitExprNoParens(x.value),
          ]),
          ","
        ),
        "]",
      ];
    case "IndexCall":
      return [
        emitExprNoParens(expr.collection),
        "[",
        emitExprNoParens(expr.index),
        "]",
        expr.collection.kind === "TableConstructor" ? "!" : "",
      ];

    default:
      throw new EmitError(expr);
  }
}
