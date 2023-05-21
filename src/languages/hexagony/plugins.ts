import { isInputless } from "@/common/Spine";
import {
  assignment,
  block,
  Expr,
  int,
  isIntLiteral,
  functionCall as fc,
} from "@/IR";
import { Plugin } from "../../common/Language";

function functionCall(name: string, ...exprs: Expr[]) {
  return fc(exprs, name);
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
          if(isCurrentProgramInputless){
            if (val === -1n) return functionCall(",", node.variable);
            if (val === 0n) return functionCall("?", node.variable);
          }
          if (val < 0) {
            result.push(functionCall("~", node.variable));
            val = -val;
          }
          while (
            val > max ||
            (val > 122 && val < 128) ||
            (val > 90 && val < 97) ||
            (val > 31 && val < 65) ||
            (val > 8 && val < 14) ||
            (val === 0n) ||
          ) {
            if ([123n, 91n, 9n].includes(val)) {
              result.push(functionCall(")"));
              val -= 1n;
            } else if ([127n, 96n, 0n].includes(val)) {
              result.push(functionCall("("));
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
