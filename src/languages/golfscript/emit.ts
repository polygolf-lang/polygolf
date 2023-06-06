import { TokenTree } from "../../common/Language";
import { EmitError, emitTextLiteral } from "../../common/emit";
import { int, integerType, IR, isIntLiteral, isSubtype } from "../../IR";
import { getType } from "../../common/getType";

export default function emitProgram(program: IR.Program): TokenTree {
  function emitMultiExpr(baseExpr: IR.Expr, parent: IR.Node): TokenTree {
    const children = baseExpr.kind === "Block" ? baseExpr.children : [baseExpr];
    if (
      ["Program", "ForRange", "ForDifferenceRange", "ForEach"].includes(
        parent.kind
      )
    ) {
      return children.map((stmt) => emitStatement(stmt, baseExpr));
    }

    return ["{", children.map((stmt) => emitStatement(stmt, baseExpr)), "}"];
  }

  function emitStatement(stmt: IR.Expr, parent: IR.Node): TokenTree {
    switch (stmt.kind) {
      case "Block":
        return emitMultiExpr(stmt, parent);
      case "ImportStatement":
        return [stmt.name, ...stmt.modules]; // TODO the ... could be avoided if TokenTree was made readonly??
      case "WhileLoop":
        return [
          emitMultiExpr(stmt.condition, stmt),
          emitMultiExpr(stmt.body, stmt),
          "while",
        ];
      case "ForRange": {
        if (stmt.inclusive) throw new EmitError(stmt, "inclusive");
        if (!isSubtype(getType(stmt.start, program), integerType(0)))
          throw new EmitError(stmt, "potentially negative low");
        return [
          emitExpr(stmt.end),
          ",",
          isIntLiteral(stmt.start, 0n) ? [] : [emitExpr(stmt.start), ">"],
          isIntLiteral(stmt.increment, 1n)
            ? []
            : [emitExpr(stmt.increment), "%"],
          "{",
          ":",
          emitExpr(stmt.variable),
          ";",
          emitMultiExpr(stmt.body, stmt),
          "}",
          "%",
        ];
      }
      case "ForDifferenceRange": {
        if (stmt.inclusive) throw new EmitError(stmt, "inclusive");
        return [
          emitExpr(stmt.difference),
          ",",
          isIntLiteral(stmt.increment, 1n)
            ? []
            : [emitExpr(stmt.increment), "%"],
          "{",
          isIntLiteral(stmt.start) && stmt.start.value < 0n
            ? [emitExpr(int(-stmt.start.value)), "-"]
            : [emitExpr(stmt.start), "+"],
          ":",
          emitExpr(stmt.variable),
          ";",
          emitMultiExpr(stmt.body, stmt),
          "}",
          "%",
        ];
      }
      case "ForEach":
        return [
          emitExpr(stmt.collection),
          "{",
          ":",
          emitExpr(stmt.variable),
          ";",
          emitMultiExpr(stmt.body, stmt),
          "}",
          "%",
        ];
      case "IfStatement":
        return [
          emitExpr(stmt.condition),
          emitMultiExpr(stmt.consequent, stmt),
          stmt.alternate !== undefined
            ? emitMultiExpr(stmt.alternate, stmt)
            : "{}",
          "if",
        ];
      case "Variants":
      case "ForEachKey":
      case "ForEachPair":
      case "ForCLike":
        throw new EmitError(stmt);
      default:
        return emitExpr(stmt);
    }
  }

  function emitExpr(expr: IR.Expr): TokenTree {
    switch (expr.kind) {
      case "Assignment":
        return [emitExpr(expr.expr), ":", emitExpr(expr.variable), ";"];
      case "Identifier":
        return expr.name;
      case "TextLiteral":
        return emitTextLiteral(expr.value, [
          [
            `"`,
            [
              [`\\`, `\\\\`],
              [`"`, `\\"`],
            ],
          ],
          [
            `"`,
            [
              [`\\`, `\\\\`],
              [`'`, `\\'`],
            ],
          ],
        ]);
      case "IntegerLiteral":
        return expr.value.toString();
      case "BinaryOp":
        return [emitExpr(expr.left), emitExpr(expr.right), expr.name];
      case "UnaryOp":
        return [emitExpr(expr.arg), expr.name];
      case "ListConstructor":
        return ["[", expr.exprs.map(emitExpr), "]"];
      case "ConditionalOp":
        return [
          emitExpr(expr.condition),
          emitExpr(expr.consequent),
          emitExpr(expr.alternate),
          "if",
        ];
      case "RangeIndexCall": {
        if (expr.oneIndexed) throw new EmitError(expr, "one indexed");

        return [
          emitExpr(expr.collection),
          emitExpr(expr.high),
          "<",
          emitExpr(expr.low),
          ">",
          isIntLiteral(expr.step, 1n) ? [] : [emitExpr(expr.step), "%"],
        ];
      }
      default:
        throw new EmitError(expr);
    }
  }

  return emitStatement(program.body, program);
}
