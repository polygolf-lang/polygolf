import { TokenTree } from "../../common/Language";
import { EmitError, emitStringLiteral, joinTrees } from "../../common/emit";
import { associativity, IR, isIntLiteral } from "../../IR";

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
        return ["var", joinTrees(e.children.map(emit), ",")];
      case "VarDeclarationWithAssignment":
        return emit(e.assignment);
      case "Block":
        return emitMultiExpr(e);
      case "ImportStatement":
        return [
          e.name,
          joinTrees(
            e.modules.map((x) => [x]),
            ","
          ),
        ];
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
        const low = emit(e.low);
        const high = emit(e.high);
        return [
          "for",
          emit(e.variable),
          "in",
          isIntLiteral(e.increment, 1n)
            ? [low, e.inclusive ? "..." : "..<", high]
            : [
                "stride",
                "(",
                joinTrees(
                  [
                    ["from:", low],
                    ["to:", high],
                    ["by:", emit(e.increment)],
                  ],
                  ","
                ),
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
        return [
          e.ident.name,
          "(",
          joinTrees(
            e.op === "repeat"
              ? [
                  ["repeating:", emit(e.args[0])],
                  ["count:", emit(e.args[1])],
                ]
              : e.op === "print"
              ? [[emit(e.args[0])], ["terminator:", '""']]
              : e.args.map((arg) => emit(arg)),
            ","
          ),
          ")",
          e.op === "text_to_int" || e.ident.name === "UnicodeScalar" ? "!" : "",
        ];
      case "MethodCall":
        if (e.ident.name === "utf8" || e.ident.name === "count") {
          return [emit(e.object), ".", e.ident.name];
        }
        return [
          emit(e.object),
          ".",
          e.ident.name,
          "(",
          joinTrees(
            e.op === "text_split"
              ? [["separator:", emit(e.args[0])]]
              : e.args.map((arg) => emit(arg)),
            ","
          ),
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
        const assoc = associativity(e.op);
        return [
          emit(e.left, prec + (assoc === "right" ? 1 : 0)),
          e.name,
          emit(e.right, prec + (assoc === "left" ? 1 : 0)),
        ];
      }
      case "UnaryOp":
        return [e.name, emit(e.arg, prec + 1)];
      case "ListConstructor":
        return ["[", joinTrees(e.exprs.map(emit), ","), "]"];
      case "TableConstructor":
        return [
          "[",
          joinTrees(
            e.kvPairs.map((x) => [emit(x.key), ":", emit(x.value)]),
            ","
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
    return joinTrees(
      children.map((stmt) => emit(stmt)),
      "\n"
    );
  }
  return [
    "{",
    joinTrees(
      children.map((stmt) => emit(stmt)),
      "\n"
    ),
    "}",
  ];
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
