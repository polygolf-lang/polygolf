import { type IR } from "../IR";
import {
  fromChildRemapFunc,
  getChild,
  getChildFragments,
  getChildren,
  type PathFragment,
} from "./fragments";

/**
 * Expand all of the variant nodes in program to get a list of fully-
 * instantiated Programs (without any Variant nodes in them)
 */
export function expandVariants(program: IR.Node): IR.Node[] {
  const n = numVariants(program);
  if (n > 16)
    throw new Error(`Variant count ${n} exceeds arbitrary limit. Giving up`);
  return allVariantOptions(program).map((x) => structuredClone(x));
}

export function getOnlyVariant(program: IR.Node): IR.Node {
  if (numVariants(program) > 1) {
    throw new Error("Program contains multiple variants!");
  }
  return allVariantOptions(program)[0];
}

function numVariants(node: IR.Node): number {
  if (node.kind === "Variants") {
    return node.variants.map(numVariants).reduce((a, b) => a + b);
  } else {
    return [...getChildren(node)].map(numVariants).reduce((a, b) => a * b, 1);
  }
}

function allVariantOptions(node: IR.Node): IR.Node[] {
  if (node.kind === "Variants") {
    return node.variants.flatMap(allVariantOptions);
  } else {
    const frags = [...getChildFragments(node)];
    const fragIndexMap = new Map(frags.map((f, i) => [fragToString(f), i]));
    if (frags.length === 0) return [node];
    const options = frags.map((frag) =>
      allVariantOptions(getChild(node, frag)),
    );
    return cartesianProduct(options).map((opt) =>
      fromChildRemapFunc(node, (f) => opt[fragIndexMap.get(fragToString(f))!]),
    );
  }
}

function fragToString(f: PathFragment) {
  return typeof f === "string" ? f : f.prop + ":" + f.index.toString();
}

function cartesianProduct<T>(a: T[][]): T[][] {
  if (a.length === 0) return [[]];
  return cartesianProduct(a.slice(1)).flatMap((p) =>
    a[0].map((e) => [e].concat(p)),
  );
}
