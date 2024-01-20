import {
  defaultDetokenizer,
  DetokenizingEmitter,
  flattenTree,
  type TokenTree,
} from "../../common/Language";
import {
  emitTextFactory,
  joinTrees,
  EmitError,
  emitIntLiteral,
} from "../../common/emit";
import { type Array, type IR, isIdent, isInt, isText } from "../../IR";
import { type CompilationContext } from "@/common/compile";

function escape(x: number, i: number, arr: number[]) {
  if (x < 100 && (i === arr.length - 1 || arr[i + 1] < 48 || arr[i + 1] > 57))
    return `\\${x.toString()}`;
  if (x < 128) return `\\x${x.toString(16).padStart(2, "0")}`;
  if (x < 1 << 16) return `\\u${x.toString(16).padStart(4, "0")}`;
  return `\\u{${x.toString(16)}}`;
}

const emitNimText = emitTextFactory(
  {
    '"TEXT"': { "\\": `\\\\`, "\n": `\\n`, "\r": `\\r`, '"': `\\"` },
    '"""TEXT"""': { '"""': null },
    'r"TEXT"': { '"': `""`, "\n": null, "\r": null },
  },
  escape,
);
const emitNimChar = emitTextFactory(
  {
    "'TEXT'": { "\\": `\\\\`, "\n": `\\n`, "\r": `\\r`, "'": `\\'` },
  },
  escape,
);

function precedence(expr: IR.Node): number {
  switch (expr.kind) {
    case "FunctionCall":
      return 12;
    case "Prefix":
      return 11;
    case "Infix":
      return binaryPrecedence(expr.name);
    case "ConditionalOp":
      return -Infinity;
  }
  return Infinity;
}

function binaryPrecedence(opname: string): number {
  switch (opname) {
    case ".":
      return 12;
    case "^":
      return 10;
    case "*":
    case "div":
    case "mod":
    case "%%":
    case "/%":
    case "shl":
    case "shr":
      return 9;
    case "+":
    case "-":
      return 8;
    case "&":
      return 7;
    case "..":
    case "..<":
      return 6;
    case "<":
    case "<=":
    case "==":
    case "!=":
    case ">=":
    case ">":
    case "in":
      return 5;
    case "and":
      return 4;
    case "or":
    case "xor":
      return 3;
    case " ":
      return 1;
  }
  if (opname.endsWith("=")) return 0;
  throw new Error(
    `Programming error - unknown Nim binary operator '${opname}.'`,
  );
}

export class NimEmitter extends DetokenizingEmitter {
  detokenize = defaultDetokenizer((a, b) => {
    const left = a[a.length - 1];
    const right = b[0];

    if (/[A-Za-z0-9_]/.test(left) && /[A-Za-z0-9_]/.test(right)) return true; // alphanums meeting

    const symbols = "=+-*/<>@$~&%|!?^.:\\";
    if (symbols.includes(left) && symbols.includes(right)) return true; // symbols meeting

    if (
      /[A-Za-z]/.test(left) &&
      ((!["var", "in", "else", "if", "while", "for"].includes(a) &&
        (symbols + `"({[`).includes(right)) ||
        right === `"`) &&
      !["=", ":", ".", "::"].includes(b)
    )
      return true; // identifier meeting an operator or string literal or opening paren

    return false;
  });

  emitTokens(program: IR.Node, context: CompilationContext) {
    function emitMultiNode(expr: IR.Node, isRoot = false): TokenTree {
      const children = expr.kind === "Block" ? expr.children : [expr];
      // Prefer newlines over semicolons at top level for aesthetics
      if (isRoot) {
        return joinNodes("\n", children);
      }
      let inner = [];
      let needsBlock = false;
      for (const child of children) {
        const needsNewline =
          "consequent" in child ||
          ("children" in child &&
            (child.kind !== "VarDeclarationBlock" ||
              child.children.length > 1)) ||
          "body" in child;
        needsBlock =
          needsBlock || needsNewline || child.kind.startsWith("VarDeclaration");
        inner.push(emit(child));
        inner.push(needsNewline ? "\n" : ";");
      }
      inner = inner.slice(0, -1);
      if (needsBlock) {
        return ["$INDENT$", "\n", inner, "$DEDENT$"];
      }
      return inner;
    }

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
      let prec = precedence(expr);
      const e = expr;
      function emitNoParens(): TokenTree {
        switch (e.kind) {
          case "Block":
            return emitMultiNode(e);
          case "VarDeclarationWithAssignment":
            return emit(e.assignment);
          case "VarDeclarationBlock":
            if (e.children.length > 1)
              return [
                "var",
                "$INDENT$",
                e.children.map((x) => ["\n", emit(x)]),
                "$DEDENT$",
              ];
            return ["var", emit(e.children[0])];
          case "Import":
            return [e.name, joinTrees(",", e.modules)];
          case "While":
            return [`while`, emit(e.condition), ":", emitMultiNode(e.body)];
          case "ForEach":
            return [
              `for`,
              e.variable === undefined ? "()" : emit(e.variable),
              "in",
              emit(e.collection),
              ":",
              emitMultiNode(e.body),
            ];
          case "If":
            return [
              "if",
              emit(e.condition),
              ":",
              emitMultiNode(e.consequent),
              e.alternate !== undefined
                ? ["else", ":", emitMultiNode(e.alternate)]
                : [],
            ];
          case "Variants":
          case "ForCLike":
            throw new EmitError(e);
          case "Assignment":
            return [emit(e.variable), "=", emit(e.expr)];
          case "ManyToManyAssignment":
            return [
              "(",
              joinNodes(",", e.variables),
              ")",
              "=",
              "(",
              joinNodes(",", e.exprs),
              ")",
            ];
          case "OneToManyAssignment":
            return [joinNodes(",", e.variables), "=", emit(e.expr)];
          case "ConditionalOp":
            return [
              "if",
              emit(e.condition, 0),
              ":",
              emit(e.consequent, 0),
              "else",
              ":",
              emit(e.alternate, 0),
            ];
          case "Identifier":
            return e.name;
          case "Text":
            return (e.targetType === "char" ? emitNimChar : emitNimText)(
              e.value,
              context.options.codepointRange,
            );
          case "Integer":
            return emitIntLiteral(e, { 10: ["", ""], 16: ["0x", ""] });
          case "FunctionCall":
            return [emit(e.func), "$GLUE$", "(", joinNodes(",", e.args), ")"];
          case "Infix": {
            const rightAssoc = e.name === "^" || e.name === " ";
            if (
              e.name === " " &&
              isText()(e.right) &&
              (isIdent()(e.left) ||
                (e.left.kind === "Infix" && e.left.name === "."))
            ) {
              const [low, high] = context.options.codepointRange;
              if (low === 1 && high === Infinity) {
                const raw = emitAsRawText(e.right.value, "");
                if (raw !== null) {
                  const res = [
                    emit(e.left, prec + (rightAssoc ? 1 : 0)),
                    "$GLUE$",
                    raw,
                  ];
                  prec = Infinity;
                  return res;
                }
              }
            }
            return [
              emit(e.left, prec + (rightAssoc ? 1 : 0)),
              /[A-Za-z]/.test(e.name[0]) ? [] : "$GLUE$",
              e.name,
              emit(e.right, prec + (rightAssoc ? 0 : 1)),
            ];
          }
          case "Prefix":
            return [e.name, emit(e.arg, prec)];
          case "List":
            return ["@", "[", joinNodes(",", e.value), "]"];
          case "Array":
            if (
              e.value.every((x) => x.kind === "Array" && x.value.length === 2)
            ) {
              const pairs = e.value as readonly Array[];
              return [
                "{",
                joinTrees(
                  ",",
                  pairs.map((x) => [emit(x.value[0]), ":", emit(x.value[1])]),
                ),
                "}",
              ];
            }
            return ["[", joinNodes(",", e.value), "]"];
          case "Set":
            return ["[", joinNodes(",", e.value), "]", ".", "toSet"];
          case "Table":
            return [
              "{",
              joinTrees(
                ",",
                e.value.map((x) => [emit(x.key), ":", emit(x.value)]),
              ),
              "}",
              ".",
              "toTable",
            ];
          case "IndexCall":
            return [emit(e.collection, 12), "$GLUE$", "[", emit(e.index), "]"];
          case "RangeIndexCall":
            if (!isInt(1n)(e.step)) throw new EmitError(expr, "step");
            return [
              emit(e.collection, 12),
              "$GLUE$",
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

      const inner = emitNoParens();
      if (prec >= minimumPrec) return inner;
      return ["(", inner, ")"];
    }
    return flattenTree(emitMultiNode(program, true));
  }
}

function emitAsRawText(value: string, prefix: string = "r"): string | null {
  if (value.includes("\n") || value.includes("\r")) return null;
  return `${prefix}"${value.replaceAll(`"`, `""`)}"`;
}
