import { TokenTree } from "../../common/Language";
import { EmitError, emitStringLiteral, joinTrees } from "../../common/emit";
import { IR, isIntLiteral } from "../../IR";

function precedence(expr: IR.Expr): number {
  switch (expr.kind) {
    case "UnaryOp":
      return unaryPrecedence(expr.name);
    case "BinaryOp":
      return binaryPrecedence(expr.name);
  }
  return Infinity;
}

function binaryPrecedence(opname: string): number {
  switch (opname) {
    case "<<":
    case ">>":
      return 6;
    case "*":
    case "/":
    case "%":
    case "&":
      return 5;
    case "+":
    case "-":
    case "|":
    case "^":
      return 4;
    case "<":
    case "<=":
    case "==":
    case "!=":
    case ">=":
    case ">":
      return 3;
    case "&&":
      return 2;
    case "||":
      return 1;
  }
  throw new Error(
    `Programming error - unknown Swift binary operator '${opname}.'`
  );
}

function unaryPrecedence(opname: string): number {
  return 7;
}

export default function emitProgram(program: IR.Program): TokenTree {
  return emitMultiExpr(program.body, true);
}

function joinExprs(
  delim: TokenTree,
  exprs: readonly IR.Expr[],
  minPrec = -Infinity
) {
  return joinTrees(
    delim,
    exprs.map((x) => emit(x, minPrec))
  );
}

/**
 * Emits the expression.
 * @param expr The expression to be emited.
 * @param minimumPrec Minimum precedence this expression must be to not need parens around it.
 * @returns Token tree corresponding to the expression.
 */
export function emit(expr: IR.Expr, minimumPrec = -Infinity): TokenTree {
  const prec = precedence(expr);
  function emitNoParens(e: IR.Expr): TokenTree {
    switch (e.kind) {
      case "VarDeclarationBlock":
        return ["var", joinExprs(",", e.children)];
      case "VarDeclarationWithAssignment":
        return emit(e.assignment);
      case "Block":
        return emitMultiExpr(e);
      case "ImportStatement":
        return [e.name, joinTrees(",", e.modules)];
      case "WhileLoop":
        return [`while`, emit(e.condition), emitMultiExpr(e.body)];
      case "ForEach":
        return [
          `for`,
          emit(e.variable),
          "in",
          emit(e.collection),
          emitMultiExpr(e.body),
        ];
      case "ForRange": {
        const start = emit(e.start);
        const end = emit(e.end);
        return [
          "for",
          emit(e.variable),
          "in",
          isIntLiteral(e.increment, 1n)
            ? [start, e.inclusive ? "..." : "..<", end]
            : [
                "stride",
                "(",
                joinTrees(",", [
                  ["from:", start],
                  ["to:", end],
                  ["by:", emit(e.increment)],
                ]),
                ")",
              ],
          emitMultiExpr(e.body),
        ];
      }
      case "IfStatement":
        return [
          "if",
          emit(e.condition),
          emitMultiExpr(e.consequent),
          e.alternate !== undefined ? ["else", emitMultiExpr(e.alternate)] : [],
        ];
      case "Variants":
      case "ForEachKey":
      case "ForEachPair":
      case "ForCLike":
        throw new EmitError(e);
      case "Assignment":
        return [emit(e.variable), "=", emit(e.expr)];
      case "MutatingBinaryOp":
        return [emit(e.variable), e.name + "=", emit(e.right)];
      case "NamedArg":
        return [e.name, ":", emit(e.value)];
      case "Identifier":
        return e.name;
      case "StringLiteral":
        return emitStringLiteral(e.value, [
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
        return e.value.toString();
      case "FunctionCall":
        if (e.ident.name === "!") return [emit(e.args[0]), "!"]; // TODO consider using special Postfix unary operator node
        return [e.ident.name, "(", joinExprs(",", e.args), ")"];
      case "MethodCall":
        if (e.property) {
          return [emit(e.object), ".", e.ident.name];
        }
        return [
          emit(e.object),
          ".",
          e.ident.name,
          "(",
          joinExprs(", ", e.args),
          ")",
        ];
      case "ConditionalOp":
        return [
          emit(e.condition),
          "?",
          emit(e.consequent),
          ":",
          emit(e.alternate),
        ];
      case "BinaryOp": {
        return [emit(e.left, prec), e.name, emit(e.right, prec + 1)];
      }
      case "UnaryOp":
        return [e.name, emit(e.arg, prec)];
      case "ListConstructor":
        return ["[", joinExprs(",", e.exprs), "]"];
      case "TableConstructor":
        return [
          "[",
          joinTrees(
            ",",
            e.kvPairs.map((x) => [emit(x.key), ":", emit(x.value)])
          ),
          "]",
        ];
      case "IndexCall":
        return [
          emit(e.collection, Infinity),
          "[",
          emit(e.index),
          "]",
          e.collection.kind === "TableConstructor" ? "!" : "",
        ];

      default:
        throw new EmitError(expr);
    }
  }

  const inner = emitNoParens(expr);
  if (prec >= minimumPrec) return inner;
  return ["(", inner, ")"];
}

function emitMultiExpr(baseExpr: IR.Expr, isRoot = false): TokenTree {
  const children = baseExpr.kind === "Block" ? baseExpr.children : [baseExpr];
  if (isRoot) {
    return joinExprs("\n", children);
  }
  return ["{", joinExprs("\n", children), "}"];
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
