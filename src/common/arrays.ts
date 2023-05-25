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
  by: (x: Item) => By
): Map<By, Item[]> {
  const result = new Map<By, Item[]>();
  for (const x of data) {
    const key = by(x);
    if (result.has(key)) result.get(key)?.push(x);
    else result.set(key, [x]);
  }
  return result;
}
