import { type TokenTree } from "@/common/Language";
import {
  emitText,
  joinTrees,
  EmitError,
  emitIntLiteral,
} from "../../common/emit";
import { type Array, type IR, isIdent, isIntLiteral, isText } from "../../IR";
import { type CompilationContext } from "@/common/compile";

function precedence(expr: IR.Node): number {
  switch (expr.kind) {
    case "Prefix":
      return 11;
    case "Infix":
      return binaryPrecedence(expr.name);
    case "FunctionCall":
      return 2;
    case "MethodCall":
      return 12;
    case "ConditionalOp":
      return -Infinity;
  }
  return Infinity;
}

function binaryPrecedence(opname: string): number {
  switch (opname) {
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
      return 6;
    case "<":
    case "<=":
    case "==":
    case "!=":
    case ">=":
    case ">":
      return 5;
    case "and":
      return 4;
    case "or":
    case "xor":
      return 3;
  }
  throw new Error(
    `Programming error - unknown Nim binary operator '${opname}.'`,
  );
}

export default function emitProgram(
  program: IR.Node,
  context: CompilationContext,
): TokenTree {
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
            emit(e.variable),
            "in",
            emit(e.collection),
            ":",
            emitMultiNode(e.body),
          ];
        case "ForRange": {
          const start = isIntLiteral(0n)(e.start) ? [] : emit(e.start);
          if (isIntLiteral(1n)(e.increment)) {
            return [
              "for",
              e.variable === undefined ? "()" : emit(e.variable),
              "in",
              start,
              "$GLUE$",
              e.inclusive ? ".." : "..<",
              emit(e.end),
              ":",
              emitMultiNode(e.body),
            ];
          }
          if (!e.inclusive) {
            throw new EmitError(e, "exlusive+step");
          }
          return [
            "for",
            e.variable === undefined ? "()" : emit(e.variable),
            "in",
            "countup",
            "$GLUE$",
            "(",
            emit(e.start),
            ",",
            emit(e.end),
            ",",
            emit(e.increment),
            ")",
            ":",
            emitMultiNode(e.body),
          ];
        }
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
        case "ForEachKey":
        case "ForEachPair":
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
        case "MutatingInfix":
          return [emit(e.variable), "$GLUE$", e.name + "=", emit(e.right)];
        case "ConditionalOp":
          return [
            "if",
            emit(e.condition),
            ":",
            emit(e.consequent),
            "else",
            ":",
            emit(e.alternate),
          ];
        case "Identifier":
          return e.name;
        case "Text":
          return emitNimText(e.value, context.options.codepointRange);
        case "Integer":
          return emitIntLiteral(e, { 10: ["", ""], 16: ["0x", ""] });
        case "FunctionCall":
          if (isIdent()(e.func) && e.args.length === 1 && isText()(e.args[0])) {
            const [low, high] = context.options.codepointRange;
            if (low === 1 && high === Infinity) {
              const raw = emitAsRawText(e.args[0].value, e.func.name);
              if (raw !== null) {
                prec = Infinity;
                return raw;
              }
            }
          }
          if (e.args.length > 1) {
            prec = 11.5;
          }
          if (e.args.length > 1 || e.args.length === 0)
            return [emit(e.func), "$GLUE$", "(", joinNodes(",", e.args), ")"];
          return [emit(e.func), joinNodes(",", e.args)];
        case "MethodCall":
          if (e.args.length > 1)
            return [
              emit(e.object, prec),
              ".",
              e.ident.name,
              e.args.length > 0
                ? ["$GLUE$", "(", joinNodes(",", e.args), ")"]
                : [],
            ];
          else {
            const [low, high] = context.options.codepointRange;
            if (
              e.args.length === 1 &&
              isText()(e.args[0]) &&
              low === 1 &&
              high === Infinity
            ) {
              const raw = emitAsRawText(e.args[0].value, e.ident.name);
              if (raw !== null) {
                prec = 12;
                return [emit(e.object, prec), ".", raw];
              }
            }
            prec = 2;
            return [
              emit(e.object, precedence(e)),
              ".",
              e.ident.name,
              e.args.length > 0 ? joinNodes(",", e.args) : [],
            ];
          }
        case "Infix": {
          const rightAssoc = e.name === "^";
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
          return ["@", "[", joinNodes(",", e.exprs), "]"];
        case "Array":
          if (
            e.exprs.every((x) => x.kind === "Array" && x.exprs.length === 2)
          ) {
            const pairs = e.exprs as readonly Array[];
            return [
              "{",
              joinTrees(
                ",",
                pairs.map((x) => [emit(x.exprs[0]), ":", emit(x.exprs[1])]),
              ),
              "}",
            ];
          }
          return ["[", joinNodes(",", e.exprs), "]"];
        case "Table":
          return [
            "{",
            joinTrees(
              ",",
              e.kvPairs.map((x) => [emit(x.key), ":", emit(x.value)]),
            ),
            "}",
            ".",
            "toTable",
          ];
        case "IndexCall":
          if (e.oneIndexed) throw new EmitError(expr, "one indexed");
          return [emit(e.collection, 12), "[", emit(e.index), "]"];
        case "RangeIndexCall":
          if (e.oneIndexed) throw new EmitError(expr, "one indexed");
          if (!isIntLiteral(1n)(e.step)) throw new EmitError(expr, "step");
          return [
            emit(e.collection, 12),
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
  return emitMultiNode(program, true);
}

function emitAsRawText(value: string, prefix: string = "r"): string | null {
  if (value.includes("\n") || value.includes("\r")) return null;
  return `${prefix}"${value.replaceAll(`"`, `""`)}"`;
}

function emitNimText(
  x: string,
  [low, high]: [number, number] = [1, Infinity],
): string {
  function mapCodepoint(x: number, i: number, arr: number[]) {
    if (low <= x && x <= high) return String.fromCharCode(x);
    if (x < 100 && (i === arr.length - 1 || arr[i + 1] < 48 || arr[i + 1] > 57))
      return `\\${x.toString()}`;
    if (x < 128) return `\\x${x.toString(16).padStart(2, "0")}`;
    if (x < 1 << 16) return `\\u${x.toString(16).padStart(4, "0")}`;
    return `\\u{${x.toString(16)}}`;
  }
  return emitText(
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
      [`"""`, [[`"""`, null]]],
      [
        [`r"`, `"`],
        [
          [`"`, `""`],
          [`\n`, null],
          [`\r`, null],
        ],
      ],
    ],
    low > 1 || high < Infinity ? mapCodepoint : undefined,
  );
}
