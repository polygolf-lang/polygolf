import { type CompilationContext } from "@/common/compile";
import {
  EmitError,
  emitIntLiteral,
  emitTextFactory,
  joinTrees,
} from "../../common/emit";
import { type IR, isInt } from "../../IR";
import { type TokenTree } from "@/common/Language";

const emitLuaText = emitTextFactory(
  {
    '"TEXT"': { "\\": "\\\\", "\n": "\\n", "\r": "\\r", '"': `\\"` },
    "'TEXT'": { "\\": `\\\\`, "\n": `\\n`, "\r": `\\r`, "'": `\\'` },
    "[[TEXT]]": { "[[": null, "]]": null },
  },
  function (x: number, i: number, arr: number[]) {
    if (x < 100)
      return i === arr.length - 1 || arr[i + 1] < 48 || arr[i + 1] > 57
        ? `\\${x.toString()}`
        : `\\${x.toString().padStart(3, "0")}`;
    return `\\u{${x.toString(16)}}`;
  },
);

function precedence(expr: IR.Node): number {
  switch (expr.kind) {
    case "Prefix":
      return 11;
    case "Infix":
      return binaryPrecedence(expr.name);
    case "Text":
    case "Array":
    case "Table":
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
    `Programming error - unknown Lua binary operator '${opname}.'`,
  );
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
  function emit(expr: IR.Node, minimumPrec: number = -Infinity): TokenTree {
    const prec = precedence(expr);
    function emitNoParens(e: IR.Node): TokenTree {
      switch (e.kind) {
        case "Block":
          return joinNodes("\n", e.children);
        case "While":
          return [`while`, emit(e.condition), "do", emit(e.body), "end"];
        case "OneToManyAssignment":
          return [joinNodes(",", e.variables), "=", emit(e.expr)];
        case "ManyToManyAssignment":
          return [joinNodes(",", e.variables), "=", joinNodes(",", e.exprs)];
        case "ForRange": {
          if (!e.inclusive) throw new EmitError(e, "exclusive");
          return [
            "for",
            e.variable === undefined ? "_" : emit(e.variable),
            "=",
            emit(e.start),
            ",",
            emit(e.end),
            isInt(1n)(e.increment) ? [] : [",", emit(e.increment)],
            "do",
            emit(e.body),
            "end",
          ];
        }
        case "If":
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
        case "Text":
          return emitLuaText(e.value, context.options.codepointRange);
        case "Integer":
          return emitIntLiteral(e, { 10: ["", ""], 16: ["0x", ""] });
        case "FunctionCall":
          return [emit(e.func), "(", joinNodes(",", e.args), ")"];
        case "MethodCall":
          return [
            emit(e.object, Infinity),
            ":",
            emit(e.ident),
            "(",
            joinNodes(",", e.args),
            ")",
          ];
        case "Infix": {
          const rightAssoc = e.name === "^";
          return [
            emit(e.left, prec + (rightAssoc ? 1 : 0)),
            e.name,
            emit(e.right, prec + (rightAssoc ? 0 : 1)),
          ];
        }
        case "Prefix":
          return [e.name, emit(e.arg, prec)];
        case "IndexCall":
          if (!e.oneIndexed) throw new EmitError(e, "zero indexed");
          return [emit(e.collection, Infinity), "[", emit(e.index), "]"];
        case "List":
        case "Array":
          return ["{", joinNodes(",", e.exprs), "}"];
        case "Table":
          return ["{", joinNodes(",", e.kvPairs), "}"];
        case "KeyValue":
          return [emit(e.key), "=", emit(e.value)];

        default:
          throw new EmitError(e);
      }
    }

    const inner = emitNoParens(expr);
    if (prec >= minimumPrec) return inner;
    return ["(", inner, ")"];
  }
  return emit(program);
}
