import { isInputless } from "../../common/Spine";
import {
  assignment,
  block,
  type Node,
  int,
  isInt,
  id,
  isOp,
  ifStatement,
  whileLoop,
  isText,
  forRange,
  conditional,
  isOfKind,
  prefix,
  op,
  BinaryOpCodes,
} from "../../IR";
import type { Plugin } from "../../common/Language";

function isSpecialValue(val: number) {
  return (
    (val > 122 && val < 128) ||
    (val > 90 && val < 97) ||
    (val > 31 && val < 65) ||
    (val > 8 && val < 14) ||
    val === 0
  );
}

let isCurrentProgramInputless = false;
export function limitSetOp(max: number): Plugin {
  return {
    name: "limitSetOp",
    visit(node, spine) {
      if (spine.isRoot) {
        isCurrentProgramInputless = isInputless(node);
      }
      if (
        node.kind === "Assignment" &&
        node.variable.kind === "Identifier" &&
        isInt()(node.expr)
      ) {
        const result: Node[] = [];
        let val = node.expr.value;
        if (isCurrentProgramInputless) {
          if (val === -1n) return prefix(",", node.variable);
          if (val === 0n) return prefix("?", node.variable);
        }
        if (val < 0) {
          result.push(prefix("~", node.variable));
          val = -val;
        }
        while (val > max || isSpecialValue(Number(val))) {
          if ([123n, 91n, 9n].includes(val)) {
            result.push(prefix(")", node.variable));
            val -= 1n;
          } else if ([127n, 96n, 0n].includes(val)) {
            result.push(prefix("(", node.variable));
            val += 1n;
          } else {
            result.push(prefix((val % 10n).toString(), node.variable));
            val /= 10n;
          }
        }
        result.push(assignment(node.variable, int(val)));
        if (result.length > 1) {
          return block(result.reverse());
        }
      }
    },
  };
}

export const decomposeExpressions: Plugin = {
  name: "decomposeExpressions",
  visit(node) {
    // TODO variadic!
    if (
      node.kind === "Assignment" &&
      node.variable.kind === "Identifier" &&
      isOp()(node.expr) &&
      node.expr.args.length === 2
    ) {
      const expr = node.expr;
      let left = expr.args[0]!;
      let right = expr.args[1]!;
      const pre = [];
      if (left.kind !== "Identifier") {
        pre.push(assignment(node.variable.name + "L", left));
        left = id(node.variable.name + "L");
      }
      if (right.kind !== "Identifier") {
        pre.push(assignment(node.variable.name + "R", right));
        right = id(node.variable.name + "R");
      }
      if (pre.length > 0) {
        return block([
          ...pre,
          assignment(node.variable, op.unsafe(expr.op, left, right)),
        ]);
      }
    }
  },
};

export const powerToForRange: Plugin = {
  name: "powerToForRange",
  visit(node) {
    if (
      node.kind === "Assignment" &&
      node.variable.kind === "Identifier" &&
      isOp("pow")(node.expr) &&
      node.expr.args[0].kind === "Identifier"
    ) {
      const res = node.variable;
      const base = node.expr.args[0];
      const exponent = node.expr.args[1];
      return block([
        assignment(res, int(1n)),
        forRange(
          res.name + "+powerIndex",
          int(0n),
          exponent,
          int(1n),
          assignment(res, op.mul(res, base)),
        ),
      ]);
    }
  },
};

export const extractConditions: Plugin = {
  name: "extractConditions",
  visit(node) {
    if (
      isOfKind("If", "While")(node) &&
      isOp(...BinaryOpCodes)(node.condition) &&
      (!isOp("gt", "leq")(node.condition) ||
        node.condition.args[0].kind !== "Identifier" ||
        !isInt(0n)(node.condition.args[1]))
    ) {
      let condValue: Node;
      let conditionOp: "gt" | "leq";
      const [a, b] = node.condition.args;
      switch (node.condition.op) {
        case "gt":
          condValue = op.sub(a, b);
          conditionOp = "gt";
          break;
        case "leq":
          condValue = op.sub(a, b);
          conditionOp = "leq";
          break;
        case "lt":
          condValue = op.sub(b, a);
          conditionOp = "gt";
          break;
        case "geq":
          condValue = op.sub(b, a);
          conditionOp = "leq";
          break;
        case "neq[Int]":
          condValue = op.pow(op.sub(a, b), int(2n));
          conditionOp = "gt";
          break;
        case "eq[Int]":
          condValue = op.pow(op.sub(a, b), int(2n));
          conditionOp = "leq";
          break;
        default:
          return;
      }
      const newVar = id("condValue");
      const condition = op[conditionOp](newVar, int(0n));
      return block([
        assignment(newVar, condValue),
        node.kind === "If"
          ? ifStatement(condition, node.consequent, node.alternate)
          : whileLoop(condition, node.body),
      ]);
    }
  },
};

export const printTextLiteral: Plugin = {
  name: "printTextLiteralToPutc",
  visit(node) {
    if (
      isOp("print[Text]")(node) &&
      isText()(node.args[0]) &&
      node.args[0].value.length > 0
    ) {
      const newVar = id("printVar");
      const bytes = [...Buffer.from(node.args[0].value, "utf8")];
      const res: Node[] = [];
      let prev = -1;
      let decimal = "";
      bytes.forEach((x, i) => {
        if (
          (x >= 48 && x <= 57) ||
          (decimal === "" &&
            x === 45 &&
            i < bytes.length - 1 &&
            bytes[i + 1] >= 48 &&
            bytes[i + 1] <= 57)
        ) {
          decimal += String.fromCharCode(x);
        } else {
          if (decimal !== "") {
            const value = Number(decimal);
            decimal = "";
            if (value !== prev) res.push(assignment(newVar, int(value)));
            prev = value;
            res.push(op["print[Int]"](newVar));
          }
          if (x !== prev)
            res.push(assignment(newVar, int(isSpecialValue(x) ? 256 + x : x)));
          prev = x;
          res.push(op["putc[byte]"](newVar));
        }
      });
      if (decimal !== "") {
        const value = Number(decimal);
        decimal = "";
        if (value !== prev) res.push(assignment(newVar, int(value)));
        prev = value;
        res.push(op["print[Int]"](newVar));
      }
      return block(res);
    }
  },
};

export const mapOpsToConditionals: Plugin = {
  name: "mapOpsToConditionals",
  visit(node) {
    if (isOp("abs")(node)) {
      return conditional(
        op.gt(node.args[0], int(0n)),
        node.args[0],
        op.neg(node.args[0]),
      );
    }
    if (isOp("min")(node)) {
      // TODO min & max are variadic!
      return conditional(
        op.gt(node.args[0], node.args[1]),
        node.args[1],
        node.args[0],
      );
    }
    if (isOp("max")(node)) {
      return conditional(
        op.gt(node.args[0], node.args[1]),
        node.args[0],
        node.args[1],
      );
    }
  },
};