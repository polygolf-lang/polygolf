import { TextDecoder, TextEncoder } from "util";
import { type Plugin } from "../common/Language";
import {
  assignment,
  block,
  forRangeCommon,
  id,
  int,
  isPolygolfOp,
  isTextLiteral,
  polygolfOp,
  print,
  text,
} from "../IR";
import { byteLength } from "../common/objective";

export const useDecimalConstantPackedPrinter: Plugin = {
  name: "useDecimalConstantPackedPrinter",
  visit(node) {
    if (
      isPolygolfOp("print", "println")(node) &&
      isTextLiteral()(node.args[0]) &&
      isLargeDecimalConstant(node.args[0].value)
    ) {
      const [prefix, main] = node.args[0].value.replace(".", ".,").split(",");
      const packed = packDecimal(main);
      return block([
        assignment("result", text(prefix)),
        forRangeCommon(
          ["packindex", 0, packed.length],
          assignment(
            "result",
            polygolfOp(
              "concat",
              id("result"),
              polygolfOp(
                "text_get_byte_slice",
                polygolfOp(
                  "int_to_text",
                  polygolfOp(
                    "add",
                    int(72n),
                    polygolfOp(
                      "text_byte_to_int",
                      polygolfOp(
                        "text_get_byte",
                        text(packed),
                        id("packindex"),
                      ),
                    ),
                  ),
                ),
                int(1n),
                int(2n),
              ),
            ),
          ),
        ),
        print(id("result")),
      ]);
    }
  },
};

function isLargeDecimalConstant(output: string): boolean {
  return /^\d\.\d*$/.test(output) && output.length > 200;
}
function packDecimal(decimal: string): string {
  let result = "";
  for (let i = 0; i < decimal.length; i += 2) {
    result += String.fromCharCode(Number(decimal.substring(i, i + 2)) + 28);
  }
  return result;
}

export const useLowDecimalListPackedPrinter: Plugin = {
  name: "useLowDecimalListPackedPrinter",
  visit(node) {
    if (
      isPolygolfOp("print", "println")(node) &&
      isTextLiteral()(node.args[0])
    ) {
      const packed = packLowDecimalList(node.args[0].value);
      if (packed === null) return;
      return forRangeCommon(
        ["packindex", 0, packed.length],
        print(
          polygolfOp("text_get_byte_to_int", text(packed), id("packindex")),
        ),
      );
    }
  },
};

function packLowDecimalList(value: string): string | null {
  if (/^[\d+\n]+[\d+]$/.test(value)) {
    const nums = value.split("\n").map(Number);
    if (nums.every((x) => 0 < x && x < 256)) {
      return nums.map((x) => String.fromCharCode(x)).join("");
    }
  }
  return null;
}

export function packSource2to1(source: string): string {
  if (byteLength(source) % 2 !== 0) source += " ";
  return new TextDecoder("utf-16").decode(new TextEncoder().encode(source));
}

export function packSource3to1(source: string): string {
  while (source.length % 3 !== 0) source += "  ";
  let result = "";
  for (let i = 0; i < source.length; i += 3) {
    const a = [i, i + 1, i + 2].map((x) => source.charCodeAt(x) - 32);
    result += String.fromCodePoint(crt(a, [97, 98, 99]));
  }
  return result;
}

function crt(rem: number[], num: number[]): number {
  let sum = 0;
  const prod = num.reduce((a, c) => a * c, 1);

  for (let i = 0; i < num.length; i++) {
    const [ni, ri] = [num[i], rem[i]];
    const p = Math.floor(prod / ni);
    sum += ri * p * mulInv(p, ni);
  }
  return sum % prod;
}

function mulInv(a: number, b: number) {
  const b0 = b;
  let [x0, x1] = [0, 1];

  if (b === 1) {
    return 1;
  }
  while (a > 1) {
    const q = Math.floor(a / b);
    [a, b] = [b, a % b];
    [x0, x1] = [x1 - q * x0, x0];
  }
  if (x1 < 0) {
    x1 += b0;
  }
  return x1;
}
