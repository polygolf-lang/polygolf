import { EmitError, emitIntLiteral, emitTextFactory } from "../../common/emit";
import { isInt, type IR, isForEachRange } from "../../IR";
import {
  defaultDetokenizer,
  VisitorEmitter,
  type EmitterVisitResult,
} from "../../common/Language";
import type { Spine } from "../../common/Spine";
import type { CompilationContext } from "../../common/compile";
import { $ } from "../../common/fragments";

const emitJanetText = emitTextFactory({
  '"TEXT"': { "\\": `\\\\`, "\n": `\\n`, "\r": `\\r`, '"': `\\"` },
  "`\nTEXT\n`": { "`": null },
  "``\nTEXT\n``": { "``": null },
  /* TO-DO: Introduce "`TEXT`" string literal:
     Cannot be empty or begin/end with a newline
   */
});

export class JanetEmitter extends VisitorEmitter {
  detokenize = defaultDetokenizer(
    (a, b) =>
      a !== "" &&
      b !== "" &&
      /[^(){}[\]`'"]/.test(a[a.length - 1]) &&
      /[^(){}[\]`'"]/.test(b[0]),
  );

  visit(n: IR.Node, spine: Spine<IR.Node>, context: CompilationContext) {
    function list(name: string, ...args: EmitterVisitResult[]) {
      return ["(", name, ...args, ")"];
    }

    if (n === undefined) return "_";
    const prop = spine.pathFragment?.prop;

    switch (n.kind) {
      case "Block": {
        return prop === "consequent" || prop === "alternate"
          ? list("do", $.children.join())
          : $.children.join();
      }
      case "While":
        return list("while", $.condition, $.body);
      case "ForEach":
        if (isForEachRange(n)) {
          const [low, high, step] = n.collection.args.map((x, i) =>
            spine.getChild($.collection, $.args.at(i)),
          );
          return isInt(1n)(n.collection.args[2])
            ? list("for", $.variable, low, high, $.body)
            : list(
                "loop",
                "[",
                $.variable,
                ":range",
                "[",
                low,
                high,
                step,
                "]",
                "]",
                $.body,
              );
        }
        return list("each", $.variable, $.collection, $.body);
      case "If":
        return list(
          "if",
          $.condition,
          $.consequent,
          n.alternate === undefined ? [] : $.alternate,
        );
      case "VarDeclarationWithAssignment": {
        const assignment = n.assignment;
        if (assignment.kind !== "Assignment") {
          throw new EmitError(
            n,
            `Declaration cannot contain ${assignment.kind}`,
          );
        }
        return $.assignment;
      }
      case "Assignment":
        return list(prop === "assignment" ? "var" : "set", $.variable, $.expr);
      case "Identifier":
        return n.name;
      case "Text":
        return emitJanetText(n.value);
      case "Integer":
        return emitIntLiteral(n, {
          10: ["", ""],
          16: ["0x", ""],
          36: ["36r", ""],
        });
      case "FunctionCall":
        return ["(", $.func, $.args.join(), ")"];
      case "RangeIndexCall":
        if (!isInt(1n)(n.step)) throw new EmitError(n, "step not equal one");
        return isInt(0n)(n.low)
          ? list("take", $.high, $.collection)
          : list("slice", $.collection, $.low, $.high);
      case "ConditionalOp":
        return list("if", $.condition, $.consequent, $.alternate);
      case "List":
        return ["@[", $.value.join(), "]"];
      case "Table":
        return ["@{", $.value.join(), "}"];
      case "KeyValue":
        return [$.key, $.value];
      default:
        throw new EmitError(n);
    }
  }
}
