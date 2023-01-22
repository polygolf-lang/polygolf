import { getType } from "../common/getType";
import { Plugin } from "../common/Language";
import {
  defaultValue,
  Expr,
  functionCall,
  int,
  listConstructor,
  polygolfOp,
  StringLiteral,
} from "../IR";

/**
 *
 * @param hashFunc Behaviour of the builtin hash function used.
 * @param hashNode Recipe for invoking the bultin hash function.
 * @param maxMod Max value of `mod`.
 * @returns Replaces `tableLiteral[key]` with `listLiteral[hash(key)%mod%len(listLiteral)]`,
 * where `hash` is the builtin used, `mod` <= `maxMod` and `listLiteral` contains values from `tableLiteral` and holes.
 */
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
        node.op === "table_get" &&
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
          let lastUsed = array.length - 1;
          while (array[lastUsed] === null) lastUsed--;

          return polygolfOp(
            "list_get",
            listConstructor(
              array
                .slice(0, lastUsed + 1)
                .map((x) => x ?? defaultValue(tableType.value))
            ),
            polygolfOp(
              "mod",
              mod === array.length
                ? hash(getKey)
                : polygolfOp("mod", hash(getKey), int(mod)),
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
): [(Expr | null)[], number] {
  let width = table.length;
  const hashedTable: [number, Expr][] = table.map((x) => [
    hashFunc(x[0]),
    x[1],
  ]);
  const result: (Expr | null)[] = Array(width);
  while (true) {
    for (let mod = width; mod <= maxMod; mod++) {
      result.fill(null);
      let collision = false;
      for (const [key, value] of hashedTable) {
        const i = (key % mod) % width;
        if (result[i] !== null) {
          collision = true;
          break;
        }
        result[i] = value;
      }
      if (!collision) {
        return [result, mod];
      }
    }
    width++;
    result.push(null);
  }
}

// a simple hashFunc to test the plugin
function javaHash(str: string): number {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return (hash + 2 ** 32) % 2 ** 32;
}
export const testTableHashing: Plugin = {
  ...tableHashing(javaHash, "hash", 9999),
  name: "testTableHashing",
};
