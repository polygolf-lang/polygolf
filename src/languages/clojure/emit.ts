import {
  EmitError,
  emitIntLiteral,
  emitTextFactory,
  getIfChain,
} from "../../common/emit";
import {
  isInt,
  isForEachRange,
  type Node,
  type If,
  type ConditionalOp,
} from "../../IR";
import {
  defaultDetokenizer,
  VisitorEmitter,
  type EmitterVisitResult,
} from "../../common/Language";
import { type Spine } from "../../common/Spine";
import type { CompilationContext } from "../../common/compile";
import { $ } from "../../common/fragments";

const emitClojureText = emitTextFactory({
  '"TEXT"': { "\\": `\\\\`, "\r": `\\r`, '"': `\\"` },
});

export class ClojureEmitter extends VisitorEmitter {
  detokenize = defaultDetokenizer(
    (a, b) =>
      a !== "" &&
      b !== "" &&
      /[^(){}[\]"]/.test(a[a.length - 1]) &&
      /[^(){}[\]"]/.test(b[0]),
  );

  visit(n: Node, spine: Spine<Node>, context: CompilationContext) {
    function list(...args: EmitterVisitResult[]) {
      return ["(", ...args, ")"];
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
          const stepIsOne = isInt(1n)(n.collection.args[2]);
          return stepIsOne && isInt(0n)(n.collection.args[0])
            ? list("dotimes", "[", $.variable, high, "]", $.body)
            : list(
                "doseq",
                "[",
                $.variable,
                list("range", low, high, stepIsOne ? [] : step),
                "]",
                $.body,
              );
        }
        return list(
          "doseq",
          "[",
          n.variable === undefined ? "_" : $.variable,
          $.collection,
          "]",
          $.body,
        );
      case "If": {
        const { ifs, alternate } = getIfChain(spine as Spine<If>);
        return list(
          ifs.length > 1 ? "cond" : "if",
          ifs.map((x) => [x.condition, x.consequent]),
          ifs.length > 1 ? '""' : [],
          alternate ?? [],
        );
      }
      case "Assignment":
        return list("def", $.variable, $.expr);
      case "Identifier":
        return n.name;
      case "Text":
        return emitClojureText(n.value);
      case "Integer":
        return emitIntLiteral(n, {
          10: ["", ""],
          16: ["0x", ""],
          36: ["36r", ""],
        });
      case "FunctionCall":
        return list($.func, $.args.join());
      case "RangeIndexCall":
        if (!isInt(1n)(n.step)) throw new EmitError(n, "step not equal one");
        return isInt(0n)(n.low)
          ? list("take", $.high, $.collection)
          : list("subvec", list("vec", $.collection), $.low, $.high);
      case "ConditionalOp": {
        const { ifs, alternate } = getIfChain(spine as Spine<ConditionalOp>);
        return list(
          ifs.length > 1 ? "cond" : "if",
          ifs.map((x) => [x.condition, x.consequent]),
          ifs.length > 1 ? '""' : [],
          alternate!,
        );
      }
      case "List":
        return ["[", $.value.join(), "]"];
      case "Table":
        return ["{", $.value.join(), "}"];
      case "KeyValue":
        return [$.key, $.value];
      default:
        throw new EmitError(n);
    }
  }
}
