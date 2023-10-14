import { CompilationContext } from "@/common/compile";
import {
  EmitError,
  emitIntLiteral,
  emitTextLiteral,
  joinTrees,
} from "../../common/emit";
import { IR, isIntLiteral } from "../../IR";
import { TokenTree } from "@/common/Language";

function precedence(expr: IR.Expr): number {
  switch (expr.kind) {
    case "UnaryOp":
      return 11;
    case "BinaryOp":
      return binaryPrecedence(expr.name);
    case "TextLiteral":
    case "ArrayConstructor":
    case "TableConstructor":
      return 1000;
  }
  return Infinity;
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

export default function emitProgram(
  program: IR.Program,
  context: CompilationContext
): TokenTree {
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
  function emit(expr: IR.Expr, minimumPrec: number = -Infinity): TokenTree {
    const prec = precedence(expr);
    function emitNoParens(e: IR.Expr): TokenTree {
      switch (e.kind) {
        case "Block":
          return joinExprs("\n", e.children);
        case "WhileLoop":
          return [`while`, emit(e.condition), "do", emit(e.body), "end"];
        case "OneToManyAssignment":
          return [joinExprs(",", e.variables), "=", emit(e.expr)];
        case "ManyToManyAssignment":
          return [joinExprs(",", e.variables), "=", joinExprs(",", e.exprs)];
        case "ForRange": {
          if (!e.inclusive) throw new EmitError(e, "exclusive");
          return [
            "for",
            e.variable === undefined ? "_" : emit(e.variable),
            "=",
            emit(e.start),
            ",",
            emit(e.end),
            isIntLiteral(e.increment, 1n) ? [] : [",", emit(e.increment)],
            "do",
            emit(e.body),
            "end",
          ];
        }
        case "IfStatement":
          return [
            "if",
            emit(e.condition),
            "then",
            emit(e.consequent),
            e.alternate !== undefined ? ["else", emit(e.alternate)] : [],
            "end",
          ];
        case "Variants":
        case "ForEach":
        case "ForEachKey":
        case "ForEachPair":
        case "ForCLike":
          throw new EmitError(e);
        case "Assignment":
          return [emit(e.variable), "=", emit(e.expr)];
        case "Identifier":
          return [e.name];
        case "TextLiteral":
          return emitLuaTextLiteral(e.value, context.options.codepointRange);
        case "IntegerLiteral":
          return emitIntLiteral(e, { 10: ["", ""], 16: ["0x", ""] });
        case "FunctionCall":
          return [emit(e.func), "(", joinExprs(",", e.args), ")"];
        case "MethodCall":
          return [
            emit(e.object, Infinity),
            ":",
            emit(e.ident),
            "(",
            joinExprs(",", e.args),
            ")",
          ];
        case "BinaryOp": {
          const rightAssoc = e.name === "^";
          return [
            emit(e.left, prec + (rightAssoc ? 1 : 0)),
            e.name,
            emit(e.right, prec + (rightAssoc ? 0 : 1)),
          ];
        }
        case "UnaryOp":
          return [e.name, emit(e.arg, prec)];
        case "IndexCall":
          if (!e.oneIndexed) throw new EmitError(e, "zero indexed");
          return [emit(e.collection, Infinity), "[", emit(e.index), "]"];
        case "ListConstructor":
        case "ArrayConstructor":
          return ["{", joinExprs(",", e.exprs), "}"];

        default:
          throw new EmitError(e);
      }
    }

    const inner = emitNoParens(expr);
    if (prec >= minimumPrec) return inner;
    return ["(", inner, ")"];
  }
  return emit(program.body);
}

function emitLuaTextLiteral(
  x: string,
  [low, high]: [number, number] = [1, Infinity]
): string {
  function mapCodepoint(x: number, i: number, arr: number[]) {
    if (low <= x && x <= high) return String.fromCharCode(x);
    if (x < 100)
      return i === arr.length - 1 || arr[i + 1] < 48 || arr[i + 1] > 57
        ? `\\${x.toString()}`
        : `\\${x.toString().padStart(3, "0")}`;
    return `\\u{${x.toString(16)}}`;
  }
  return emitTextLiteral(
    x,
    [
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
    ],
    low > 1 || high < Infinity ? mapCodepoint : undefined
  );
}
