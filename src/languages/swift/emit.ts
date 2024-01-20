import {
  DetokenizingEmitter,
  flattenTree,
  type Token,
  type TokenTree,
} from "../../common/Language";
import {
  EmitError,
  emitIntLiteral,
  emitTextFactory,
  joinTrees,
} from "../../common/emit";
import { type IR, id, type Node } from "../../IR";
import { type CompilationContext } from "@/common/compile";

const unicode01to09repls = {
  "\u{1}": `\\u{1}`,
  "\u{2}": `\\u{2}`,
  "\u{3}": `\\u{3}`,
  "\u{4}": `\\u{4}`,
  "\u{5}": `\\u{5}`,
  "\u{6}": `\\u{6}`,
  "\u{7}": `\\u{7}`,
  "\u{8}": `\\u{8}`,
  "\u{9}": `\\u{9}`,
} as const;
const unicode0Bto1Frepls = {
  "\u{b}": `\\u{b}`,
  "\u{c}": `\\u{c}`,
  "\u{d}": `\\u{d}`,
  "\u{e}": `\\u{e}`,
  "\u{f}": `\\u{f}`,
  "\u{10}": `\\u{10}`,
  "\u{11}": `\\u{11}`,
  "\u{12}": `\\u{12}`,
  "\u{13}": `\\u{13}`,
  "\u{14}": `\\u{14}`,
  "\u{15}": `\\u{15}`,
  "\u{16}": `\\u{16}`,
  "\u{17}": `\\u{17}`,
  "\u{18}": `\\u{18}`,
  "\u{19}": `\\u{19}`,
  "\u{1a}": `\\u{1a}`,
  "\u{1b}": `\\u{1b}`,
  "\u{1c}": `\\u{1c}`,
  "\u{1d}": `\\u{1d}`,
  "\u{1e}": `\\u{1e}`,
  "\u{1f}": `\\u{1f}`,
} as const;

const emitSwiftText = emitTextFactory(
  {
    '"TEXT"': {
      "\\": `\\\\`,
      ...unicode01to09repls,
      "\u{a}": `\\n`,
      ...unicode0Bto1Frepls,
      '"': `\\"`,
    },
    '"""\nTEXT\n"""': {
      "\\": `\\\\`,
      ...unicode01to09repls,
      ...unicode0Bto1Frepls,
      '"""': `\\"""`,
    },
  },
  (x) => `\\u{${x.toString(16)}}`,
);

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
    case "..<":
    case "...":
      return 3.5;
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
  if (opname.endsWith("=")) return 0;
  throw new Error(
    `Programming error - unknown Swift binary operator '${opname}.'`,
  );
}

function unaryPrecedence(opname: string): number {
  return 7;
}

export class SwiftEmitter extends DetokenizingEmitter {
  emitTokens(program: Node, context: CompilationContext) {
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
              emit(e.variable ?? id("_")),
              "in",
              emit(e.collection),
              emitMultiNode(e.body),
            ];
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
          case "ForCLike":
            throw new EmitError(e);
          case "Assignment":
            return [emit(e.variable), "=", emit(e.expr)];
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
            return [emit(e.object, Infinity), ".", e.ident.name];
          case "MethodCall":
            return [
              emit(e.object, Infinity),
              ".",
              e.ident.name,
              "(",
              joinNodes(",", e.args),
              ")",
            ];
          case "ConditionalOp":
            return [
              emit(e.condition, prec + 1),
              "?",
              emit(e.consequent),
              ":",
              emit(e.alternate, prec),
            ];
          case "Infix": {
            return [emit(e.left, prec), e.name, emit(e.right, prec + 1)];
          }
          case "Prefix":
            return [e.name, emit(e.arg, prec)];
          case "Postfix":
            return [emit(e.arg, prec), e.name];
          case "List":
            return ["[", joinNodes(",", e.value), "]"];
          case "Set":
            return ["Set([", joinNodes(",", e.value), "])"];
          case "Table":
            return [
              "[",
              joinTrees(
                ",",
                e.value.map((x) => [emit(x.key), ":", emit(x.value)]),
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
          case "RangeIndexCall":
            return [
              emit(e.collection, Infinity),
              "[",
              emit(e.low),
              "..<",
              emit(e.high),
              "]",
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
      const children =
        BaseNode.kind === "Block" ? BaseNode.children : [BaseNode];
      if (isRoot) {
        return joinNodes("\n", children);
      }
      return ["{", joinNodes("\n", children), "}"];
    }
    return flattenTree(emitMultiNode(program, true));
  }

  // Custom detokenizer reflects Swift's whitespace rules, namely binary ops needing equal amount of whitespace on both sides
  detokenize(tokens: Token[]): string {
    function isAlphaNum(s: string): boolean {
      return /[A-Za-z0-9]/.test(s);
    }

    // Tokens that need whitespace on both sides:
    //   A binary op followed by a unary op
    //   `!=`
    //   `&` followed by any of `*+-` (without space they are interpreted together as an overflow operator)
    function needsWhiteSpaceOnBothSides(
      token: string,
      nextToken: string,
    ): boolean {
      return (
        (/^[-+*%/<>=^*|~]+$/.test(token) && /[-~]/.test(nextToken[0])) ||
        (token === `&` && /[*+-]/.test(nextToken[0])) ||
        token === `!=`
      );
    }

    function needsWhiteSpace(prevToken: string, token: string): boolean {
      return (
        (isAlphaNum(prevToken[prevToken.length - 1]) && isAlphaNum(token[0])) ||
        ([`if`, `in`, `while`].includes(prevToken) && token[0] !== `(`) ||
        token[0] === `?` ||
        needsWhiteSpaceOnBothSides(prevToken, token)
      );
    }

    let result = tokens[0];
    for (let i = 1; i < tokens.length; i++) {
      if (
        needsWhiteSpace(tokens[i - 1], tokens[i]) ||
        (i + 1 < tokens.length &&
          needsWhiteSpaceOnBothSides(tokens[i], tokens[i + 1]))
      )
        result += " ";
      result += tokens[i];
    }
    return result.trim();
  }
}
