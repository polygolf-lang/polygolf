import { type TokenTree } from "../../common/Language";
import {
  EmitError,
  emitIntLiteral,
  emitText,
  joinTrees,
} from "../../common/emit";
import { type IR, isIntLiteral } from "../../IR";
import { type CompilationContext } from "@/common/compile";

function precedence(expr: IR.Node): number {
  switch (expr.kind) {
    case "Prefix":
      return unaryPrecedence(expr.name);
    case "Infix":
      return binaryPrecedence(expr.name);
    case "ConditionalOp":
      return 0;
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
    `Programming error - unknown Swift binary operator '${opname}.'`,
  );
}

function unaryPrecedence(opname: string): number {
  return 7;
}

export default function emitProgram(
  program: IR.Node,
  context: CompilationContext,
): TokenTree {
  function joinNodes(
    delim: TokenTree,
    exprs: readonly IR.Node[],
    minPrec = -Infinity,
  ) {
    return joinTrees(
      delim,
      exprs.map((x) => emit(x, minPrec)),
    );
  }

  /**
   * Emits the expression.
   * @param expr The expression to be emited.
   * @param minimumPrec Minimum precedence this expression must be to not need parens around it.
   * @returns Token tree corresponding to the expression.
   */
  function emit(expr: IR.Node, minimumPrec = -Infinity): TokenTree {
    const prec = precedence(expr);
    function emitNoParens(e: IR.Node): TokenTree {
      switch (e.kind) {
        case "VarDeclarationBlock":
          return ["var", joinNodes(",", e.children)];
        case "VarDeclarationWithAssignment":
          return emit(e.assignment);
        case "Block":
          return emitMultiNode(e);
        case "Import":
          return [e.name, joinTrees(",", e.modules)];
        case "While":
          return [`while`, emit(e.condition), emitMultiNode(e.body)];
        case "ForEach":
          return [
            `for`,
            emit(e.variable),
            "in",
            emit(e.collection),
            emitMultiNode(e.body),
          ];
        case "ForRange": {
          const start = emit(e.start);
          const end = emit(e.end);
          return [
            "for",
            e.variable === undefined ? "_" : emit(e.variable),
            "in",
            isIntLiteral(1n)(e.increment)
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
            emitMultiNode(e.body),
          ];
        }
        case "If":
          return [
            "if",
            emit(e.condition),
            emitMultiNode(e.consequent),
            e.alternate !== undefined
              ? ["else", emitMultiNode(e.alternate)]
              : [],
          ];
        case "Variants":
        case "ForEachKey":
        case "ForEachPair":
        case "ForCLike":
          throw new EmitError(e);
        case "Assignment":
          return [emit(e.variable), "=", emit(e.expr)];
        case "MutatingInfix":
          return [emit(e.variable), e.name + "=", emit(e.right)];
        case "NamedArg":
          return [e.name, ":", emit(e.value)];
        case "Identifier":
          return e.name;
        case "Text":
          return emitSwiftText(e.value, context.options.codepointRange);
        case "Integer":
          return emitIntLiteral(e, { 10: ["", ""], 16: ["0x", ""] });
        case "FunctionCall":
          return [emit(e.func), "(", joinNodes(",", e.args), ")"];
        case "PropertyCall":
          return [emit(e.object), ".", e.ident.name];
        case "MethodCall":
          return [
            emit(e.object),
            ".",
            e.ident.name,
            "(",
            joinNodes(", ", e.args),
            ")",
          ];
        case "ConditionalOp":
          return [
            emit(e.condition, 1),
            "?",
            emit(e.consequent),
            ":",
            emit(e.alternate),
          ];
        case "Infix": {
          return [emit(e.left, prec), e.name, emit(e.right, prec + 1)];
        }
        case "Prefix":
          return [e.name, emit(e.arg, prec)];
        case "Postfix":
          return [emit(e.arg, prec), e.name];
        case "List":
          return ["[", joinNodes(",", e.exprs), "]"];
        case "Table":
          return [
            "[",
            joinTrees(
              ",",
              e.kvPairs.map((x) => [emit(x.key), ":", emit(x.value)]),
            ),
            "]",
          ];
        case "IndexCall":
          return [
            emit(e.collection, Infinity),
            "[",
            emit(e.index),
            "]",
            e.collection.kind === "Table" ? "!" : "",
          ];

        default:
          throw new EmitError(expr);
      }
    }

    const inner = emitNoParens(expr);
    if (prec >= minimumPrec) return inner;
    return ["(", inner, ")"];
  }

  function emitMultiNode(BaseNode: IR.Node, isRoot = false): TokenTree {
    const children = BaseNode.kind === "Block" ? BaseNode.children : [BaseNode];
    if (isRoot) {
      return joinNodes("\n", children);
    }
    return ["{", joinNodes("\n", children), "}"];
  }
  return emitMultiNode(program, true);
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

function emitSwiftText(
  x: string,
  [low, high]: [number, number] = [1, Infinity],
): string {
  function mapCodepoint(x: number) {
    if (low <= x && x <= high) return String.fromCharCode(x);
    return `\\u{${x.toString(16)}}`;
  }
  return emitText(
    x,
    [
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
    ],
    low > 1 || high < Infinity ? mapCodepoint : undefined,
  );
}
