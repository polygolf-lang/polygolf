import { isInputless } from "@/common/Spine";
import {
  assignment,
  block,
  Expr,
  int,
  isIntLiteral,
  functionCall as fc,
  id,
  binaryOp,
  isPolygolfOp,
  ifStatement,
  polygolfOp,
  whileLoop,
  isTextLiteral,
} from "@/IR";
import { Plugin } from "../../common/Language";

function functionCall(name: string, ...exprs: Expr[]) {
  return fc(name, exprs);
}

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
    visit(node) {
      if (node.kind === "Program") {
        isCurrentProgramInputless =
          isInputless(node) || isCurrentProgramInputless;
      } else {
        if (
          node.kind === "Assignment" &&
          node.variable.kind === "Identifier" &&
          isIntLiteral(node.expr)
        ) {
          const result: Expr[] = [];
          let val = node.expr.value;
          if (isCurrentProgramInputless) {
            if (val === -1n) return functionCall(",", node.variable);
            if (val === 0n) return functionCall("?", node.variable);
          }
          if (val < 0) {
            result.push(functionCall("~", node.variable));
            val = -val;
          }
          while (val > max || isSpecialValue(Number(val))) {
            if ([123n, 91n, 9n].includes(val)) {
              result.push(functionCall(")", node.variable));
              val -= 1n;
            } else if ([127n, 96n, 0n].includes(val)) {
              result.push(functionCall("(", node.variable));
              val += 1n;
            } else {
              result.push(functionCall((val % 10n).toString(), node.variable));
              val /= 10n;
            }
          }
          result.push(assignment(node.variable, int(val)));
          if (result.length > 1) {
            return block(result.reverse());
          }
        }
      }
    },
  };
}

export const decomposeExpressions: Plugin = {
  name: "decomposeExpressions",
  visit(node) {
    if (
      node.kind === "Assignment" &&
      node.variable.kind === "Identifier" &&
      node.expr.kind === "BinaryOp"
    ) {
      const expr = node.expr;
      let left = expr.left;
      let right = expr.right;
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
        return block([...pre, binaryOp(expr.name, left, right)]);
      }
    }
  },
};

export const extractConditions: Plugin = {
  name: "extractConditions",
  visit(node) {
    if (
      (node.kind === "IfStatement" || node.kind === "WhileLoop") &&
      isPolygolfOp(node.condition) &&
      (!isPolygolfOp(node.condition, "gt", "leq") ||
        node.condition.args[0].kind !== "Identifier" ||
        !isIntLiteral(node.condition.args[1], 0n))
    ) {
      let condValue: Expr;
      let conditionOp: "gt" | "leq";
      const args = node.condition.args;
      switch (node.condition.op) {
        case "gt":
          condValue = polygolfOp("sub", ...args);
          conditionOp = "gt";
          break;
        case "leq":
          condValue = polygolfOp("sub", ...args);
          conditionOp = "leq";
          break;
        case "lt":
          condValue = polygolfOp("sub", args[1], args[0]);
          conditionOp = "gt";
          break;
        case "geq":
          condValue = polygolfOp("sub", args[1], args[0]);
          conditionOp = "leq";
          break;
        case "neq":
          condValue = polygolfOp("pow", polygolfOp("sub", ...args), int(2n));
          conditionOp = "gt";
          break;
        case "eq":
          condValue = polygolfOp("pow", polygolfOp("sub", ...args), int(2n));
          conditionOp = "leq";
          break;
        default:
          return;
      }
      const newVar = id("condValue");
      const condition = polygolfOp(conditionOp, newVar, int(0n));
      return block([
        assignment(newVar, condValue),
        node.kind === "IfStatement"
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
      isPolygolfOp(node, "print") &&
      isTextLiteral(node.args[0]) &&
      node.args[0].value.length > 0
    ) {
      const newVar = id("printVar");
      const bytes = [...Buffer.from(node.args[0].value, "utf8")];
      const res: Expr[] = [];
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
            res.push(polygolfOp("print_int", newVar));
          }
          if (x !== prev)
            res.push(assignment(newVar, int(isSpecialValue(x) ? 256 + x : x)));
          prev = x;
          res.push(polygolfOp("putc", newVar));
        }
      });
      if (decimal !== "") {
        const value = Number(decimal);
        decimal = "";
        if (value !== prev) res.push(assignment(newVar, int(value)));
        prev = value;
        res.push(polygolfOp("print_int", newVar));
      }
      return block(res);
    }
  },
};
