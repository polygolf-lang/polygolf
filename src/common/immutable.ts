// some helpers
export function replaceAtIndex<T>(
  arr: ReadonlyArray<T>,
  index: number,
  value: T
) {
  if (index < 0 || index >= arr.length)
    throw new Error(
      `Index out of bounds: ${index} for readonly array of length ${arr.length}`
    );
  return arr
    .slice(0, index)
    .concat([value])
    .concat(arr.slice(index + 1));
}
