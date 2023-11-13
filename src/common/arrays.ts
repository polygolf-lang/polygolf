export function replaceAtIndex<T>(
  arr: ReadonlyArray<T>,
  index: number,
  ...insert: T[]
) {
  const a = [...arr];
  a.splice(index, 1, ...insert);
  return a;
}

export function groupby<Item, By>(
  data: Item[],
  by: (x: Item) => By,
): Map<By, Item[]> {
  const result = new Map<By, Item[]>();
  for (const x of data) {
    const key = by(x);
    if (result.has(key)) result.get(key)?.push(x);
    else result.set(key, [x]);
  }
  return result;
}

export function filterInplace<T>(data: T[], predicate: (x: T) => boolean) {
  let length = 0;
  for (const item of data) {
    if (predicate(item)) data[length++] = item;
  }
  data.length = length;
}

export function mapObjectValues<T1 extends string, T2, T3>(
  obj: Record<T1, T2>,
  f: (v: T2, k: T1) => T3,
): Record<T1, T3>;
export function mapObjectValues<T1 extends string, T2, T3>(
  obj: Partial<Record<T1, T2>>,
  f: (v: T2, k: T1) => T3,
): Partial<Record<T1, T3>>;
export function mapObjectValues<T1 extends string, T2, T3>(
  obj: Partial<Record<T1, T2>>,
  f: (v: T2, k: T1) => T3,
) {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k as T1, f(v as T2, k as T1)]),
  );
}
