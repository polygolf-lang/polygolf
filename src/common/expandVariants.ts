import { IR } from "../IR";
import { programToSpine } from "./Spine";
import { PolygolfError } from "./errors";
import {
  fromChildRemapFunc,
  getChild,
  getChildFragments,
  getChildren,
  PathFragment,
} from "./fragments";
import { readsFromArgv, readsFromStdin } from "./symbols";

/**
 * Expand all of the variant nodes in program to get a list of fully-
 * instantiated Programs (without any Variant nodes in them)
 */
export function expandVariants(
  program: IR.Program,
  preferStdin: boolean
): IR.Program[] {
  const n = numVariants(program);
  if (n > 16)
    throw new Error(`Variant count ${n} exceeds arbitrary limit. Giving up`);
  const variants = allVariantOptions(program) as IR.Program[];
  const variantsWithMethods = variants.map((variant) => {
    const spine = programToSpine(variant);
    return {
      variant,
      readsFromArgv: spine.someNode(readsFromArgv),
      readsFromStdin: spine.someNode(readsFromStdin),
    };
  });
  if (variantsWithMethods.some((x) => x.readsFromArgv && x.readsFromStdin)) {
    throw new PolygolfError("Program cannot read from both argv and stdin.");
  }
  const matching = variantsWithMethods.filter(
    (x) =>
      (preferStdin && !x.readsFromArgv) || (!preferStdin && !x.readsFromStdin)
  );
  if (matching.length > 0) return matching.map((x) => x.variant);
  return variants;
}

export function getOnlyVariant(program: IR.Program): IR.Program {
  if (numVariants(program) > 1) {
    throw new Error("Program contains multiple variants!");
  }
  return allVariantOptions(program)[0] as IR.Program;
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
      allVariantOptions(getChild(node, frag))
    );
    return cartesianProduct(options).map((opt) =>
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
