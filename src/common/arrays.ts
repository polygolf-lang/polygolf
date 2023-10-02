export function replaceAtIndex<T>(
  arr: ReadonlyArray<T>,
  index: number,
  ...insert: T[]
) {
  const a = [...arr];
  a.splice(index, 1, ...insert);
  return a;
}

export function filterInplace<T>(data: T[], predicate: (x: T) => boolean) {
  let length = 0;
  for (const item of data) {
    if (predicate(item)) data[length++] = item;
  }
  data.length = length;
}
