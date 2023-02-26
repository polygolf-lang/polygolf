import { TokenTree } from "@/common/Language";
import { emitStringLiteral, joinTrees, EmitError } from "../../common/emit";
import { associativity, IR, isIntLiteral } from "../../IR";

function precedence(expr: IR.Expr): number {
  switch (expr.kind) {
    case "UnaryOp":
      return 11;
    case "BinaryOp":
      return binaryPrecedence(expr.name);
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

export default function emitProgram(program: IR.Program): TokenTree {
  return emitMultiExpr(program.body, true);
}

function emitMultiExpr(expr: IR.Expr, isRoot = false): TokenTree {
  const children = expr.kind === "Block" ? expr.children : [expr];
  // Prefer newlines over semicolons at top level for aesthetics
  if (isRoot) {
    return joinTrees(children.map(emit), "\n");
  }
  let inner = [];
  let needsBlock = false;
  for (const child of children) {
    const needsNewline =
      "consequent" in child ||
      ("children" in child &&
        (child.kind !== "VarDeclarationBlock" || child.children.length > 1)) ||
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

/**
 * Emits the expression.
 * @param expr The expression to be emited.
 * @param minimumPrec Minimum precedence this expression must be to not need parens around it.
 * @returns Token tree corresponding to the expression.
 */
function emit(expr: IR.Expr, minimumPrec = -Infinity): TokenTree {
  const prec = precedence(expr);
  function emitNoParens(e: IR.Expr): TokenTree {
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
        return [
          e.name,
          joinTrees(
            e.modules.map((x) => [x]),
            ","
          ),
        ];
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
        const low = isIntLiteral(e.low, 0n) ? [] : emit(e.low);
        if (isIntLiteral(e.increment, 1n)) {
          return [
            "for",
            emit(e.variable),
            "in",
            low,
            "$GLUE$",
            e.inclusive ? ".." : "..<",
            emit(e.high),
            ":",
            emitMultiExpr(e.body),
          ];
        }
        if (!e.inclusive) {
          throw new EmitError(e, "exlusive+step");
        }
        return [
          "for",
          emit(e.variable),
          "in",
          "countup",
          "$GLUE$",
          "(",
          emit(e.low),
          ",",
          emit(e.high),
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
          joinTrees(e.variables.map(emit), ","),
          ")",
          "=",
          "(",
          joinTrees(e.exprs.map(emit), ","),
          ")",
        ];
      case "OneToManyAssignment":
        return [joinTrees(e.variables.map(emit), ","), "=", emit(e.expr)];
      case "MutatingBinaryOp":
        return [emit(e.variable), "$GLUE$", e.name + "=", emit(e.right)];
      case "Identifier":
        return e.name;
      case "StringLiteral":
        return emitStringLiteral(e.value, [
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
            `"""`,
            [
              [`\\`, `\\\\`],
              [`"""`, `\\"""`],
            ],
          ],
          [
            [`r"`, `"`],
            [
              [`"`, `""`],
              [`\n`, null],
              [`\r`, null],
            ],
          ],
        ]);
      case "IntegerLiteral":
        return e.value.toString();
      case "FunctionCall":
        if (e.args.length === 1 && e.args[0].kind === "StringLiteral") {
          return [e.ident.name, "$GLUE$", emit(e.args[0])];
        }
        if (minimumPrec > -Infinity || e.args.length > 1 || e.args.length === 0)
          return [
            e.ident.name,
            "$GLUE$",
            "(",
            joinTrees(e.args.map(emit), ","),
            ")",
          ];
        return [e.ident.name, joinTrees(e.args.map(emit), ",")];
      case "MethodCall":
        if (minimumPrec > -Infinity || e.args.length > 1)
          return [
            emit(e.object, Infinity),
            ".",
            e.ident.name,
            e.args.length > 0
              ? ["$GLUE$", "(", joinTrees(e.args.map(emit), ","), ")"]
              : [],
          ];
        else
          return [
            emit(e.object, Infinity),
            ".",
            e.ident.name,
            e.args.length > 0 ? joinTrees(e.args.map(emit), ",") : [],
          ];
      case "BinaryOp": {
        const assoc = associativity(e.op);
        return [
          emit(e.left, prec + (assoc === "right" ? 1 : 0)),
          /[A-Za-z]/.test(e.name[0]) ? [] : "$GLUE$",
          e.name,
          emit(e.right, prec + (assoc === "left" ? 1 : 0)),
        ];
      }
      case "UnaryOp":
        return [e.name, emit(e.arg, prec + 1)];
      case "ListConstructor":
        return ["@", "[", joinTrees(e.exprs.map(emit), ","), "]"];
      case "TableConstructor":
        return [
          "{",
          joinTrees(
            e.kvPairs.map((x) => [emit(x.key), ":", emit(x.value)]),
            ","
          ),
          "}",
          ".",
          "toTable",
        ];
      case "IndexCall":
        if (e.oneIndexed) throw new EmitError(expr, "one indexed");
        return [emit(e.collection, Infinity), "[", emit(e.index), "]"];
      case "RangeIndexCall":
        if (e.oneIndexed) throw new EmitError(expr, "one indexed");
        if (!isIntLiteral(e.step, 1n)) throw new EmitError(expr, "step");
        return [
          emit(e.collection, Infinity),
          "[",
          emit(e.low),
          "..",
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
