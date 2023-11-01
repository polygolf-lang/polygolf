import { type TokenTree } from "../../common/Language";
import { EmitError, emitText } from "../../common/emit";
import { int, integerType, type IR, isIntLiteral, isSubtype } from "../../IR";
import { getType } from "../../common/getType";

export default function emitProgram(program: IR.Node): TokenTree {
  function emitMultiNode(BaseNode: IR.Node, parent: IR.Node | null): TokenTree {
    const children = BaseNode.kind === "Block" ? BaseNode.children : [BaseNode];
    if (
      parent === null ||
      ["ForRange", "ForDifferenceRange", "ForEach"].includes(parent.kind)
    ) {
      return children.map((stmt) => emitStatement(stmt, BaseNode));
    }

    return ["{", children.map((stmt) => emitStatement(stmt, BaseNode)), "}"];
  }

  function emitStatement(stmt: IR.Node, parent: IR.Node | null): TokenTree {
    switch (stmt.kind) {
      case "Block":
        return emitMultiNode(stmt, parent);
      case "While":
        return [
          emitMultiNode(stmt.condition, stmt),
          emitMultiNode(stmt.body, stmt),
          "while",
        ];
      case "ForRange": {
        if (stmt.inclusive) throw new EmitError(stmt, "inclusive");
        if (!isSubtype(getType(stmt.start, program), integerType(0)))
          throw new EmitError(stmt, "potentially negative low");
        if (stmt.variable === undefined) throw new EmitError(stmt, "indexless");
        return [
          emitNode(stmt.end),
          ",",
          isIntLiteral(0n)(stmt.start) ? [] : [emitNode(stmt.start), ">"],
          isIntLiteral(1n)(stmt.increment)
            ? []
            : [emitNode(stmt.increment), "%"],
          "{",
          ":",
          emitNode(stmt.variable),
          ";",
          emitMultiNode(stmt.body, stmt),
          "}",
          "%",
        ];
      }
      case "ForDifferenceRange": {
        if (stmt.inclusive) throw new EmitError(stmt, "inclusive");
        return [
          emitNode(stmt.difference),
          ",",
          isIntLiteral(1n)(stmt.increment)
            ? []
            : [emitNode(stmt.increment), "%"],
          "{",
          isIntLiteral()(stmt.start) && stmt.start.value < 0n
            ? [emitNode(int(-stmt.start.value)), "-"]
            : [emitNode(stmt.start), "+"],
          ":",
          emitNode(stmt.variable),
          ";",
          emitMultiNode(stmt.body, stmt),
          "}",
          "%",
        ];
      }
      case "ForEach":
        return [
          emitNode(stmt.collection),
          "{",
          ":",
          emitNode(stmt.variable),
          ";",
          emitMultiNode(stmt.body, stmt),
          "}",
          "%",
        ];
      case "If":
        return [
          emitNode(stmt.condition),
          emitMultiNode(stmt.consequent, stmt),
          stmt.alternate !== undefined
            ? emitMultiNode(stmt.alternate, stmt)
            : "{}",
          "if",
        ];
      case "Variants":
      case "ForEachKey":
      case "ForEachPair":
      case "ForCLike":
        throw new EmitError(stmt);
      default:
        return emitNode(stmt);
    }
  }

  function emitNode(expr: IR.Node): TokenTree {
    switch (expr.kind) {
      case "Assignment":
        return [emitNode(expr.expr), ":", emitNode(expr.variable), ";"];
      case "Identifier":
        return expr.name;
      case "Text":
        return emitText(expr.value, [
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
      case "Integer":
        return expr.value.toString();
      case "Infix":
        return [emitNode(expr.left), emitNode(expr.right), expr.name];
      case "Prefix":
        return [emitNode(expr.arg), expr.name];
      case "List":
        return ["[", expr.exprs.map(emitNode), "]"];
      case "ConditionalOp":
        return [
          emitNode(expr.condition),
          emitNode(expr.consequent),
          emitNode(expr.alternate),
          "if",
        ];
      case "RangeIndexCall": {
        if (expr.oneIndexed) throw new EmitError(expr, "one indexed");

        return [
          emitNode(expr.collection),
          emitNode(expr.high),
          "<",
          emitNode(expr.low),
          ">",
          isIntLiteral(1n)(expr.step) ? [] : [emitNode(expr.step), "%"],
        ];
      }
      default:
        throw new EmitError(expr);
    }
  }

  return emitStatement(program, null);
}
