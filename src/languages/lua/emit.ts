import { type CompilationContext } from "../../common/compile";
import { EmitError, emitIntLiteral, emitTextFactory } from "../../common/emit";
import { type IR, isInt, isOp } from "../../IR";
import {
  defaultDetokenizer,
  PrecedenceVisitorEmitter,
} from "../../common/Language";
import type { Spine } from "../../common/Spine";
import { $, type PathFragment } from "../../common/fragments";

const emitLuaText = emitTextFactory(
  {
    '"TEXT"': { "\\": "\\\\", "\n": "\\n", "\r": "\\r", '"': `\\"` },
    "'TEXT'": { "\\": `\\\\`, "\n": `\\n`, "\r": `\\r`, "'": `\\'` },
    "[[TEXT]]": { "[[": null, "]]": null },
  },
  function (x: number, i: number, arr: number[]) {
    if (x < 100)
      return i === arr.length - 1 || arr[i + 1] < 48 || arr[i + 1] > 57
        ? `\\${x.toString()}`
        : `\\${x.toString().padStart(3, "0")}`;
    return `\\u{${x.toString(16)}}`;
  },
);

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
    `Programming error - unknown Lua binary operator '${opname}.'`,
  );
}

export class LuaEmitter extends PrecedenceVisitorEmitter {
  detokenize = defaultDetokenizer();

  minPrecForNoParens(parent: IR.Node, fragment: PathFragment) {
    return parent.kind === "MethodCall" && fragment.prop === "object"
      ? Infinity
      : parent.kind === "IndexCall" && fragment.prop === "collection"
      ? Infinity
      : parent.kind === "Infix"
      ? fragment.prop === "left"
        ? this.prec(parent) + (parent.name === "^" ? 1 : 0)
        : this.prec(parent) + (parent.name === "^" ? 0 : 1)
      : parent.kind === "Prefix"
      ? this.prec(parent)
      : -Infinity;
  }

  prec(expr: IR.Node): number {
    switch (expr.kind) {
      case "Prefix":
        return 11;
      case "Infix":
        return binaryPrecedence(expr.name);
      case "Text":
      case "Array":
      case "List":
      case "Table":
        return 1000;
    }
    return Infinity;
  }

  visitNoParens(e: IR.Node, spine: Spine, context: CompilationContext) {
    switch (e.kind) {
      case "Block":
        return $.children.join("\n");
      case "While":
        return ["while", $.condition, "do", $.body, "end"];
      case "OneToManyAssignment":
        return [$.variables.join(","), "=", $.expr];
      case "ManyToManyAssignment":
        return [$.variables.join(","), "=", $.exprs.join(",")];
      case "ForEach": {
        if (isOp("range_incl")(e.collection)) {
          const [low, high, step] = e.collection.args.map((x, i) =>
            spine.getChild($.collection, $.args.at(i)),
          );
          return [
            "for",
            e.variable === undefined ? "_" : $.variable,
            "=",
            [low, ",", high],
            isInt(1n)(e.collection.args[2]) ? [] : [",", step],
            "do",
            $.body,
            "end",
          ];
        }
        break;
      }
      case "If":
        return [
          "if",
          $.condition,
          "then",
          $.consequent,
          e.alternate !== undefined ? ["else", $.alternate] : [],
          "end",
        ];
      case "Assignment":
        return [$.variable, "=", $.expr];
      case "Identifier":
        return [e.name];
      case "Text":
        return emitLuaText(e.value, context.options.codepointRange);
      case "Integer":
        return emitIntLiteral(e, { 10: ["", ""], 16: ["0x", ""] });
      case "FunctionCall":
        return [$.func, "(", $.args.join(","), ")"];
      case "MethodCall":
        return [$.object, ":", $.ident, "(", $.args.join(","), ")"];
      case "Infix":
        return [$.left, e.name, $.right];
      case "Prefix":
        return [e.name, $.arg];
      case "IndexCall":
        return [$.collection, "[", $.index, "]"];
      case "List":
      case "Array":
      case "Table":
        return ["{", $.value.join(","), "}"];
      case "KeyValue":
        return [$.key, "=", $.value];
    }
    throw new EmitError(e);
  }
}
