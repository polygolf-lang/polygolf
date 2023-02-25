import { Node } from "@/IR";

const cachedStringification = new WeakMap<Node, string>();
export function stringify(x: Node): string {
  if (cachedStringification.has(x)) return cachedStringification.get(x)!;
  const result = JSON.stringify(
    x,
    (key, value) =>
      key === "source"
        ? undefined
        : typeof value === "bigint"
        ? value.toString() + "n"
        : value,
    2
  );
  cachedStringification.set(x, result);
  return result;
}
