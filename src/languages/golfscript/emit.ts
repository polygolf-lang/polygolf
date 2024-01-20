import {
  defaultDetokenizer,
  DetokenizingEmitter,
  flattenTree,
  type TokenTree,
} from "../../common/Language";
import { EmitError, emitTextFactory } from "../../common/emit";
import { integerType, type IR, isInt, isSubtype, isOp, int } from "../../IR";
import { getType } from "../../common/getType";

const emitGolfscriptText = emitTextFactory({
  '"TEXT"': { "\\": "\\\\", '"': `\\"` },
  "'TEXT'": { "\\": `\\\\`, "'": `\\'` },
});

export class GolfscriptEmitter extends DetokenizingEmitter {
  detokenize = defaultDetokenizer(
    (a, b) =>
      a !== "" &&
      b !== "" &&
      ((/[A-Za-z0-9_]/.test(a[a.length - 1]) && /[A-Za-z0-9_]/.test(b[0])) ||
        (a[a.length - 1] === "-" && /[0-9]/.test(b[0]))),
  );

  emitTokens(program: IR.Node) {
    function emitMultiNode(
      BaseNode: IR.Node,
      parent: IR.Node | null,
    ): TokenTree {
      const children =
        BaseNode.kind === "Block" ? BaseNode.children : [BaseNode];
      if (
        parent === null ||
        ["ForDifferenceRange", "ForEach"].includes(parent.kind)
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
        case "ForEach": {
          let collection: TokenTree;
          let shift: TokenTree = [];
          if (
            isOp("range_incl", "range_excl", "range_diff_excl")(stmt.collection)
          ) {
            // Consider moving this to a plugin
            const [a, b, c] = stmt.collection.args;
            if (stmt.collection.op === "range_excl") {
              collection = [
                emitNode(b),
                ",",
                isInt(0n)(a) ? [] : [emitNode(a), ">"],
                isInt(1n)(c) ? [] : [emitNode(c), "%"],
              ];
            } else if (stmt.collection.op === "range_diff_excl") {
              collection = [
                emitNode(b),
                ",",
                isInt(1n)(c) ? [] : [emitNode(c), "%"],
              ];
              shift =
                isInt()(a) && a.value < 0n
                  ? [emitNode(int(-a.value)), "-"]
                  : [emitNode(a), "+"];
            } else throw new EmitError(stmt, "inclusive");
          } else {
            collection = emitNode(stmt.collection);
          }
          return [
            collection,
            "{",
            shift,
            stmt.variable === undefined ? [] : [":", emitNode(stmt.variable)],
            ";",
            emitMultiNode(stmt.body, stmt),
            "}",
            "%",
          ];
        }
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
        case "ForCLike":
          throw new EmitError(stmt);
        default:
          return emitNode(stmt);
      }
    }

    function emitNode(expr: IR.Node): TokenTree {
      switch (expr.kind) {
        case "Assignment":
          if (expr.variable.kind === "IndexCall")
            /*  Implements equivalent of this Python code:
                temp = (index+len(col))%len(col); coll = coll[:temp] + [expr] + coll[temp+1:];
          */
            return [
              emitNode(expr.variable.collection),
              ".",
              isSubtype(getType(expr.variable.index, program), integerType(0))
                ? emitNode(expr.variable.index)
                : [
                    ".",
                    ",",
                    ".",
                    emitNode(expr.variable.index),
                    "+",
                    "\\",
                    "%",
                  ],
              ".",
              "@",
              "<",
              "[",
              emitNode(expr.expr),
              "]",
              "+",
              "@",
              "@",
              ")",
              ">",
              "+",
              ":",
              emitNode(expr.variable.collection),
              ";",
            ];
          return [emitNode(expr.expr), ":", emitNode(expr.variable), ";"];
        case "Identifier":
          return expr.name;
        case "Text":
          return emitGolfscriptText(expr.value);
        case "Integer":
          return expr.value.toString();
        case "FunctionCall":
          return [...expr.args, expr.func].map(emitNode);
        case "List":
          return ["[", expr.value.map(emitNode), "]"];
        case "ConditionalOp":
          return [
            emitNode(expr.condition),
            emitNode(expr.consequent),
            emitNode(expr.alternate),
            "if",
          ];
        case "IndexCall": {
          return [emitNode(expr.collection), emitNode(expr.index), "="];
        }
        case "RangeIndexCall":
          return [
            emitNode(expr.collection),
            emitNode(expr.high),
            "<",
            emitNode(expr.low),
            ">",
            isInt(1n)(expr.step) ? [] : [emitNode(expr.step), "%"],
          ];
        default:
          throw new EmitError(expr);
      }
    }

    return flattenTree(emitStatement(program, null));
  }
}
