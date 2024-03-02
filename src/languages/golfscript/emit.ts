import {
  defaultDetokenizer,
  VisitorEmitter,
  type EmitterVisitResult,
} from "../../common/Language";
import { EmitError, emitTextFactory } from "../../common/emit";
import { integerType, isInt, isSubtype, isOp, type Node } from "../../IR";
import { getType } from "../../common/getType";
import type { Spine } from "../../common/Spine";
import { $ } from "../../common/fragments";

const emitGolfscriptText = emitTextFactory({
  '"TEXT"': { "\\": "\\\\", '"': `\\"` },
  "'TEXT'": { "\\": `\\\\`, "'": `\\'` },
});

export class GolfscriptEmitter extends VisitorEmitter {
  detokenize = defaultDetokenizer(
    (a, b) =>
      a !== "" &&
      b !== "" &&
      ((/[A-Za-z0-9_]/.test(a[a.length - 1]) && /[A-Za-z0-9_]/.test(b[0])) ||
        (a[a.length - 1] === "-" && /[0-9]/.test(b[0]))),
  );

  visit(n: Node, s: Spine) {
    switch (n.kind) {
      case "Block":
        return $.children.join();
      case "While":
        return ["{", $.condition, "}{", $.body, "}", "while"];
      case "ForEach": {
        let collection: EmitterVisitResult;
        let shift: EmitterVisitResult = [];
        if (isOp("range_incl", "range_excl", "range_diff_excl")(n.collection)) {
          // Consider moving this to a plugin
          const [a, b, c] = n.collection.args.map((x, i) =>
            s.getChild($.collection, $.args.at(i)),
          );
          if (n.collection.op === "range_excl") {
            collection = [
              b,
              ",",
              isInt(0n)(a.node) ? [] : [a, ">"],
              isInt(1n)(c.node) ? [] : [c, "%"],
            ];
          } else if (n.collection.op === "range_diff_excl") {
            collection = [b, ",", isInt(1n)(c.node) ? [] : [c, "%"]];
            shift =
              isInt()(a.node) && a.node.value < 0n
                ? [(-a.node.value).toString(), "-"]
                : [a, "+"];
          } else throw new EmitError(n, "inclusive");
        } else {
          collection = $.collection;
        }
        return [
          collection,
          "{",
          shift,
          n.variable === undefined ? [] : [":", $.variable],
          ";",
          $.body,
          "}",
          "%",
        ];
      }
      case "If":
        return [
          $.condition,
          "{",
          $.consequent,
          "}",
          ["{", n.alternate !== undefined ? $.alternate : [], "}"],
          "if",
        ];
      case "Assignment":
        if (n.variable.kind === "IndexCall")
          /*  Implements equivalent of this Python code:
                temp = (index+len(col))%len(col); coll = coll[:temp] + [expr] + coll[temp+1:];
          */
          return [
            s.getChild($.variable, $.collection),
            ".",
            isSubtype(getType(n.variable.index, s), integerType(0))
              ? s.getChild($.variable, $.index)
              : [".,.", s.getChild($.variable, $.index), "+\\%"],
            ".@<[",
            $.expr,
            "]+@@)>+:",
            s.getChild($.variable, $.collection),
            ";",
          ];
        return [$.expr, ":", $.variable, ";"];
      case "Identifier":
        return n.name;
      case "Text":
        return emitGolfscriptText(n.value);
      case "Integer":
        return n.value.toString();
      case "FunctionCall":
        return [$.args.join(), $.func];
      case "List":
        return ["[", $.value.join(), "]"];
      case "ConditionalOp":
        return [$.condition, $.consequent, $.alternate, "if"];
      case "IndexCall": {
        return [$.collection, $.index, "="];
      }
      case "RangeIndexCall":
        return [
          $.collection,
          $.high,
          "<",
          $.low,
          ">",
          isInt(1n)(n.step) ? [] : [$.step, "%"],
        ];
      default:
        throw new EmitError(n);
    }
  }
}
