import { IR } from "../IR";
import {
  fromChildRemapFunc,
  getChild,
  getChildFragments,
  PathFragment,
} from "./fragments";

/**
 * Expand all of the variant nodes in program to get a list of fully-
 * instantiated Programs (without any Variant nodes in them)
 */
export function expandVariants(program: IR.Program): IR.Program[] {
  return allVariantOptions(program) as IR.Program[];
}

function allVariantOptions(node: IR.Node): IR.Node[] {
  if (node.kind === "Variants") {
    return node.variants.flatMap(allVariantOptions);
  } else {
    const frags = [...getChildFragments(node)];
    const fragIndexMap = new Map(frags.map((f, i) => [fragToString(f), i]));
    if (frags.length === 0) return [node];
    const options = frags.map((frag) =>
      allVariantOptions(getChild(node, frag))
    );
    return cartesianProduct(options).flatMap((opt) =>
      fromChildRemapFunc(node, (f) => opt[fragIndexMap.get(fragToString(f))!])
    );
  }
}

function fragToString(f: PathFragment) {
  return typeof f === "string" ? f : f.prop + ":" + f.index.toString();
}

function cartesianProduct<T>(a: T[][]): T[][] {
  if (a.length === 0) return [[]];
  return cartesianProduct(a.slice(1)).flatMap((p) =>
    a[0].map((e) => [e].concat(p))
  );
}
