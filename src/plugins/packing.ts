import { Path, Visitor } from "common/traverse";
import {
  assignment,
  binaryOp,
  forRangeCommon,
  functionCall,
  id,
  int,
  print,
  simpleType,
  stringGetByte,
  stringLiteral,
  unaryOp,
  varDeclaration,
} from "IR";

export const useDecimalConstantPackedPrinter: Visitor = {
  enter(path: Path) {
    const node = path.node;
    if (
      node.type === "Print" &&
      node.value.type === "StringLiteral" &&
      isLargeDecimalConstant(node.value.value)
    ) {
      const [prefix, main] = node.value.value.replace(".", ".,").split(",");
      const packed = packDecimal(main);
      path.replaceWithMultiple([
        varDeclaration("result", simpleType("string")),
        assignment("result", stringLiteral(prefix)),
        forRangeCommon(
          ["packindex", 0, packed.length],
          assignment(
            "result",
            binaryOp(
              "str_concat",
              id("result"),
              functionCall(
                null,
                [
                  unaryOp(
                    "int_to_str",
                    binaryOp(
                      "add",
                      int(72n),
                      stringGetByte(stringLiteral(packed), id("packindex"))
                    )
                  ),
                  int(1n),
                  int(2n),
                ],
                "substr"
              )
            )
          )
        ),
        print(id("result")),
      ]);
    }
  },
};

function isLargeDecimalConstant(output: string): boolean {
  return /\d\.\d*/.test(output) && output.length > 200;
}
function packDecimal(decimal: string): string {
  let result = "";
  for (let i = 0; i < decimal.length; i += 2) {
    result += String.fromCharCode(Number(decimal.substring(i, i + 2)) + 28);
  }
  return result;
}

export const useLowDecimalListPackedPrinter: Visitor = {
  enter(path: Path) {
    const node = path.node;
    if (node.type === "Print" && node.value.type === "StringLiteral") {
      const packed = packLowDecimalList(node.value.value);
      if (packed.length === 0) return;
      path.replaceWithMultiple([
        forRangeCommon(
          ["packindex", 0, packed.length],
          print(stringGetByte(stringLiteral(packed), id("packindex")))
        ),
      ]);
    }
  },
};

function packLowDecimalList(value: string): string {
  const nums = value.split("\n").map(Number);
  if (nums.every((x) => !isNaN(x) && x > 0 && x < 256)) {
    return nums.map((x) => String.fromCharCode(x)).join("");
  }
  return "";
}
