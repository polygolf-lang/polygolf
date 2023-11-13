import { getType } from "../common/getType";
import {
  integerType,
  isOp,
  isSubtype,
  isText,
  type OpCode,
  op,
  int,
} from "../IR";
import { type Plugin } from "../common/Language";
import { mapOps } from "./ops";
import { charLength } from "../common/objective";

function toBidirectionalMap<T>(pairs: [T, T][]): Map<T, T> {
  return new Map<T, T>([...pairs, ...pairs.map<[T, T]>(([k, v]) => [v, k])]);
}

const textOpsEquivalenceAscii = toBidirectionalMap<OpCode>([
  ["find[codepoint]", "find[byte]"],
  ["at[codepoint]", "at[byte]"],
  ["ord_at[codepoint]", "ord_at[byte]"],
  ["length[codepoint]", "length[byte]"],
  ["reversed[codepoint]", "reversed[byte]"],
  ["slice[codepoint]", "slice[byte]"],
  ["ord[codepoint]", "ord[byte]"],
]);

const integerOpsEquivalenceAscii = toBidirectionalMap<OpCode>([
  ["char[byte]", "char[codepoint]"],
]);

/** Swaps an op to another one, provided they are equivalent for the subtype. */
export function useEquivalentTextOp(
  useBytes = true,
  useCodepoints = true,
): Plugin {
  if (!useBytes && !useCodepoints)
    throw new Error(
      "Programming error. Choose at least one of bytes and codepoints.",
    );
  return {
    name: `useEquivalentTextOp(${useBytes.toString()}, ${useCodepoints.toString()})`,
    visit(node, spine) {
      if (!isOp()(node)) return;
      if (node.args.length < 1) return;
      const typeArg0 = getType(node.args[0], spine);
      if (
        (!useBytes && node.op.includes("codepoint")) ||
        (!useCodepoints && node.op.includes("byte"))
      )
        return;
      if (typeArg0.kind === "text" && typeArg0.isAscii) {
        const alternative = textOpsEquivalenceAscii.get(node.op);
        if (alternative !== undefined) return { ...node, op: alternative };
      }
      if (isSubtype(typeArg0, integerType(0, 127))) {
        const alternative = integerOpsEquivalenceAscii.get(node.op);
        if (alternative !== undefined) return { ...node, op: alternative };
      }
    },
  };
}

export const textGetToIntToTextGet: Plugin = mapOps(
  {
    "ord_at[byte]": (x) => op("ord[byte]", op("at[byte]", ...x)),
    "ord_at[codepoint]": (x) => op("ord[codepoint]", op("at[codepoint]", ...x)),
  },
  "textGetToIntToTextGet",
);

export const textToIntToTextGetToInt: Plugin = mapOps(
  {
    "ord[byte]": (x) =>
      isOp("at[byte]")(x[0]) ? op("ord_at[byte]", ...x[0].args) : undefined,
    "ord[codepoint]": (x) =>
      isOp("at[codepoint]")(x[0])
        ? op("ord_at[codepoint]", ...x[0].args)
        : undefined,
  },
  "textToIntToTextGetToInt",
);

export const textGetToTextGetToIntToText: Plugin = mapOps(
  {
    "at[byte]": (x) => op("char[byte]", op("ord_at[byte]", ...x)),
    "at[codepoint]": (x) =>
      op("char[codepoint]", op("ord_at[codepoint]", ...x)),
  },
  "textGetToTextGetToIntToText",
);

export const textToIntToFirstIndexTextGetToInt: Plugin = mapOps(
  {
    "ord[byte]": (x) => op("ord_at[byte]", x[0], int(0n)),
    "ord[codepoint]": (x) => op("ord_at[codepoint]", x[0], int(0n)),
  },
  "textToIntToFirstIndexTextGetToInt",
);

/**
 * Converts nested text_replace to a text_multireplace provided the arguments are
 * text literals with no overlap.
 * @param singleCharInputsOnly Only applies the transform if the input args are single characters.
 * This is used in Python. In the future it might can generalised to some general callback filter.
 * @returns
 */
export function useMultireplace(singleCharInputsOnly = false): Plugin {
  return {
    name: "useMultireplace",
    visit(node) {
      const isReplace = isOp("replace", "text_multireplace");
      if (isReplace(node) && isReplace(node.args[0])) {
        const a = node.args[0].args.slice(1);
        const b = node.args.slice(1);
        if (a.every(isText()) && b.every(isText())) {
          const aValues = a.map((x) => x.value);
          const bValues = b.map((x) => x.value);
          const aIn = aValues.filter((_, i) => i % 2 === 0);
          const aOut = aValues.filter((_, i) => i % 2 === 1);
          const bIn = bValues.filter((_, i) => i % 2 === 0);
          const bOut = bValues.filter((_, i) => i % 2 === 1);
          const aInSet = new Set(aIn.join());
          const aOutSet = new Set(aOut.join());
          const bInSet = new Set(bIn.join());
          const bOutSet = new Set(bOut.join());
          if (
            (!singleCharInputsOnly ||
              [...aIn, ...bIn].every((x) => charLength(x) === 1)) &&
            ![...aInSet].some((x) => bInSet.has(x)) &&
            ![...bInSet].some((x) => aOutSet.has(x)) &&
            ![...aInSet].some((x) => bOutSet.has(x))
          ) {
            return op("text_multireplace", ...node.args[0].args, ...b);
          }
        }
      }
    },
  };
}

export const replaceToSplitAndJoin: Plugin = mapOps(
  {
    replace: ([x, y, z]) => op("join", op("split", x, y), z),
  },
  "replaceToSplitAndJoin",
);
