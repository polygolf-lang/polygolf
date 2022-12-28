// some helpers
export function replaceAtIndex<T>(
  arr: ReadonlyArray<T>,
  index: number,
  ...insert: T[]
) {
  const a = [...arr];
  a.splice(index, 1, ...insert);
  return a;
}
