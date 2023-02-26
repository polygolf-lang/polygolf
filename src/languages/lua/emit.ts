import { EmitError, emitStringLiteral, joinTrees } from "../../common/emit";
import { associativity, IR, isIntLiteral } from "../../IR";
import { TokenTree } from "@/common/Language";

function precedence(expr: IR.Expr): number {
  switch (expr.kind) {
    case "UnaryOp":
      return 11;
    case "BinaryOp":
      return binaryPrecedence(expr.name);
    case "StringLiteral":
    case "ArrayConstructor":
    case "TableConstructor":
      return 1000;
    case "Block":
      return -Infinity;
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

export default function emitProgram(program: IR.Program): TokenTree {
  return emit(program.body);
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
        return joinTrees(e.children.map(emit), "\n");
      case "WhileLoop":
        return [`while`, emit(e.condition), "do", emit(e.body), "end"];
      case "OneToManyAssignment":
        return [joinTrees(e.variables.map(emit), ","), "=", emit(e.expr)];
      case "ManyToManyAssignment":
        return [
          joinTrees(e.variables.map(emit), ","),
          "=",
          joinTrees(e.exprs.map(emit), ","),
        ];
      case "ForRange": {
        if (!e.inclusive) throw new EmitError(e, "exclusive");
        return [
          "for",
          emit(e.variable),
          "=",
          emit(e.low),
          ",",
          emit(e.high),
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
        ]);
      case "IntegerLiteral":
        return [e.value.toString()];
      case "FunctionCall":
        return [e.ident.name, "(", joinTrees(e.args.map(emit), ","), ")"];
      case "MethodCall":
        return [
          emit(e.object, Infinity),
          ":",
          e.ident.name,
          "(",
          joinTrees(
            e.args.map((arg) => emit(arg)),
            ","
          ),
          ")",
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
      case "IndexCall":
        if (!e.oneIndexed) throw new EmitError(e, "zero indexed");
        return [emit(e.collection, Infinity), "[", emit(e.index), "]"];
      case "ListConstructor":
      case "ArrayConstructor":
        return ["{", joinTrees(e.exprs.map(emit), ","), "}"];

      default:
        throw new EmitError(e);
    }
  }

  const inner = emitNoParens(expr);
  console.log(expr, prec, minimumPrec, prec >= minimumPrec, inner);
  if (prec >= minimumPrec) return inner;
  return ["(", inner, ")"];
}
