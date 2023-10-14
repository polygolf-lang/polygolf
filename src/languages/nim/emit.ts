import { TokenTree } from "@/common/Language";
import {
  emitTextLiteral,
  joinTrees,
  EmitError,
  emitIntLiteral,
} from "../../common/emit";
import { ArrayConstructor, IR, isIntLiteral, isTextLiteral } from "../../IR";
import { CompilationContext } from "@/common/compile";

function precedence(expr: IR.Expr): number {
  switch (expr.kind) {
    case "UnaryOp":
      return 11;
    case "BinaryOp":
      return binaryPrecedence(expr.name);
    case "FunctionCall":
      return 2;
    case "MethodCall":
      return 12;
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
    `Programming error - unknown Nim binary operator '${opname}.'`
  );
}

export default function emitProgram(
  program: IR.Program,
  context: CompilationContext
): TokenTree {
  function emitMultiExpr(expr: IR.Expr, isRoot = false): TokenTree {
    const children = expr.kind === "Block" ? expr.children : [expr];
    // Prefer newlines over semicolons at top level for aesthetics
    if (isRoot) {
      return joinExprs("\n", children);
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
  function emit(expr: IR.Expr, minimumPrec = -Infinity): TokenTree {
    let prec = precedence(expr);
    const e = expr;
    function emitNoParens(): TokenTree {
      switch (e.kind) {
        case "Block":
          return emitMultiExpr(e);
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
        case "ImportStatement":
          return [e.name, joinTrees(",", e.modules)];
        case "WhileLoop":
          return [`while`, emit(e.condition), ":", emitMultiExpr(e.body)];
        case "ForEach":
          return [
            `for`,
            emit(e.variable),
            "in",
            emit(e.collection),
            ":",
            emitMultiExpr(e.body),
          ];
        case "ForRange": {
          const start = isIntLiteral(e.start, 0n) ? [] : emit(e.start);
          if (isIntLiteral(e.increment, 1n)) {
            return [
              "for",
              e.variable === undefined ? "()" : emit(e.variable),
              "in",
              start,
              "$GLUE$",
              e.inclusive ? ".." : "..<",
              emit(e.end),
              ":",
              emitMultiExpr(e.body),
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
            emitMultiExpr(e.body),
          ];
        }
        case "IfStatement":
          return [
            "if",
            emit(e.condition),
            ":",
            emitMultiExpr(e.consequent),
            e.alternate !== undefined
              ? ["else", ":", emitMultiExpr(e.alternate)]
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
            joinExprs(",", e.variables),
            ")",
            "=",
            "(",
            joinExprs(",", e.exprs),
            ")",
          ];
        case "OneToManyAssignment":
          return [joinExprs(",", e.variables), "=", emit(e.expr)];
        case "MutatingBinaryOp":
          return [emit(e.variable), "$GLUE$", e.name + "=", emit(e.right)];
        case "Identifier":
          return e.name;
        case "TextLiteral":
          return emitNimTextLiteral(e.value, context.options.codepointRange);
        case "IntegerLiteral":
          return emitIntLiteral(e, { 10: ["", ""], 16: ["0x", ""] });
        case "FunctionCall":
          if (
            e.func.kind === "Identifier" &&
            e.args.length === 1 &&
            isTextLiteral(e.args[0])
          ) {
            const [low, high] = context.options.codepointRange;
            if (low === 1 && high === Infinity) {
              const raw = emitAsRawTextLiteral(e.args[0].value, e.func.name);
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
            return [emit(e.func), "$GLUE$", "(", joinExprs(",", e.args), ")"];
          return [emit(e.func), joinExprs(",", e.args)];
        case "MethodCall":
          if (e.args.length > 1)
            return [
              emit(e.object, prec),
              ".",
              e.ident.name,
              e.args.length > 0
                ? ["$GLUE$", "(", joinExprs(",", e.args), ")"]
                : [],
            ];
          else {
            const [low, high] = context.options.codepointRange;
            if (
              e.args.length === 1 &&
              isTextLiteral(e.args[0]) &&
              low === 1 &&
              high === Infinity
            ) {
              const raw = emitAsRawTextLiteral(e.args[0].value, e.ident.name);
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
              e.args.length > 0 ? joinExprs(",", e.args) : [],
            ];
          }
        case "BinaryOp": {
          const rightAssoc = e.name === "^";
          return [
            emit(e.left, prec + (rightAssoc ? 1 : 0)),
            /[A-Za-z]/.test(e.name[0]) ? [] : "$GLUE$",
            e.name,
            emit(e.right, prec + (rightAssoc ? 0 : 1)),
          ];
        }
        case "UnaryOp":
          return [e.name, emit(e.arg, prec)];
        case "ListConstructor":
          return ["@", "[", joinExprs(",", e.exprs), "]"];
        case "ArrayConstructor":
          if (
            e.exprs.every(
              (x) => x.kind === "ArrayConstructor" && x.exprs.length === 2
            )
          ) {
            const pairs = e.exprs as readonly ArrayConstructor[];
            return [
              "{",
              joinTrees(
                ",",
                pairs.map((x) => [emit(x.exprs[0]), ":", emit(x.exprs[1])])
              ),
              "}",
            ];
          }
          return ["[", joinExprs(",", e.exprs), "]"];
        case "TableConstructor":
          return [
            "{",
            joinTrees(
              ",",
              e.kvPairs.map((x) => [emit(x.key), ":", emit(x.value)])
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
          if (!isIntLiteral(e.step, 1n)) throw new EmitError(expr, "step");
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
  return emitMultiExpr(program.body, true);
}

function emitAsRawTextLiteral(
  value: string,
  prefix: string = "r"
): string | null {
  if (value.includes("\n") || value.includes("\r")) return null;
  return `${prefix}"${value.replaceAll(`"`, `""`)}"`;
}

function emitNimTextLiteral(
  x: string,
  [low, high]: [number, number] = [1, Infinity]
): string {
  function mapCodepoint(x: number, i: number, arr: number[]) {
    if (low <= x && x <= high) return String.fromCharCode(x);
    if (x < 100 && (i === arr.length - 1 || arr[i + 1] < 48 || arr[i + 1] > 57))
      return `\\${x.toString()}`;
    if (x < 128) return `\\x${x.toString(16).padStart(2, "0")}`;
    if (x < 1 << 16) return `\\u${x.toString(16).padStart(4, "0")}`;
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
    low > 1 || high < Infinity ? mapCodepoint : undefined
  );
}
