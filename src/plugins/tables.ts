import { getType } from "../common/getType";
import { type Plugin } from "../common/Language";
import {
  defaultValue,
  type Node,
  functionCall,
  int,
  integerType,
  isOfKind,
  isOp,
  isText,
  list,
  op,
  type Text,
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
  hashNode: string | ((x: Node) => Node) = "hash",
  maxMod = 9999,
): Plugin {
  let hash: (x: Node) => Node;
  if (typeof hashNode === "string") {
    hash = (x: Node) => ({
      ...functionCall(hashNode, x),
      type: integerType(0, 2 ** 32 - 1),
    });
  } else {
    hash = hashNode;
  }
  return {
    name: "tableHashing(...)",
    visit(node, spine) {
      if (isOp("at[Table]")(node) && node.args[0].kind === "Table") {
        const table = node.args[0];
        const getKey = node.args[1];
        const tableType = getType(table, spine);
        if (
          tableType.kind === "Table" &&
          tableType.key.kind === "text" &&
          table.kvPairs.every((x) => isText()(x.key))
        ) {
          const searchResult = findHash(
            hashFunc,
            table.kvPairs.map((x) => [(x.key as Text).value, x.value]),
            maxMod,
          );
          if (searchResult === null) return undefined;
          const [array, mod] = searchResult;
          let lastUsed = array.length - 1;
          while (array[lastUsed] === null) lastUsed--;

          return op["at[List]"](
            list(
              array
                .slice(0, lastUsed + 1)
                .map((x) => x ?? defaultValue(tableType.value)),
            ),
            op.mod(
              mod === array.length
                ? hash(getKey)
                : op.mod(hash(getKey), int(mod)),
              int(array.length),
            ),
          );
        }
      }
    },
  };
}

function findHash( // TODO: Allow collisions in keys that map to the same value.
  hashFunc: (x: string) => number,
  table: [string, Node][],
  maxMod: number,
): [(Node | null)[], number] | null {
  const hashedTable: [number, Node][] = table.map((x) => [
    hashFunc(x[0]),
    x[1],
  ]);
  const result: (Node | null)[] = Array(table.length);
  for (let width = table.length; width < table.length * 4; width++) {
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
    result.push(null);
  }
  return null;
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
export function testTableHashing(maxMod: number): Plugin {
  return {
    ...tableHashing(javaHash, "hash", maxMod),
    name: `testTableHashing(${maxMod})`,
  };
}

export function tableToListLookup(node: Node) {
  if (isOp("at[Table]")(node) && node.args[0].kind === "Table") {
    const keys = node.args[0].kvPairs.map((x) => x.key);
    if (
      keys.every(isOfKind("Integer", "Text")) &&
      new Set(keys.map((x) => x.value)).size === keys.length
    ) {
      const values = node.args[0].kvPairs.map((x) => x.value);
      const at = node.args[1];
      return op["at[List]"](list(values), op["find[List]"](list(keys), at));
    }
  }
}
