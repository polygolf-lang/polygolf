import { getType } from "@/common/getType";
import { Plugin } from "@/common/Language";
import {
  Expr,
  functionCall,
  id,
  int,
  listConstructor,
  polygolfOp,
  StringLiteral,
} from "@/IR";

export function tableHashing(
  hashFunc: (x: string) => number,
  hashNode: string | ((x: Expr) => Expr) = "hash",
  maxMod = 99999
): Plugin {
  let hash: (x: Expr) => Expr;
  if (typeof hashNode === "string") {
    hash = (x: Expr) => functionCall([x], hashNode);
  } else {
    hash = hashNode;
  }
  return {
    name: "tableHashing(...)",
    visit(node, spine) {
      if (
        node.kind === "PolygolfOp" &&
        node.op == "table_get" &&
        node.args[0].kind === "TableConstructor"
      ) {
        const table = node.args[0];
        const getKey = node.args[1];
        const tableType = getType(table, spine.root.node);
        if (
          tableType.kind === "Table" &&
          tableType.key.kind === "text" &&
          table.kvPairs.every((x) => x.key.kind === "StringLiteral")
        ) {
          const [array, mod] = findHash(
            hashFunc,
            table.kvPairs.map((x) => [(x.key as StringLiteral).value, x.value]),
            maxMod
          );
          return polygolfOp(
            "list_get",
            listConstructor(array),
            polygolfOp(
              "mod",
              polygolfOp("mod", hash(getKey), int(mod)),
              int(array.length)
            )
          );
        }
      }
    },
  };
}

function findHash(
  hashFunc: (x: string) => number,
  table: [string, Expr][],
  maxMod: number
): [Expr[], number] {
  throw new Error("Not implemented.");
}
