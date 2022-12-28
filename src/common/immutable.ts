// Immutable from https://stackoverflow.com/a/58993872/7481517
export type Immutable<T> = T extends ImmutablePrimitive
  ? T
  : T extends Array<infer U>
  ? ImmutableArray<U>
  : T extends Map<infer K, infer V>
  ? ImmutableMap<K, V>
  : T extends Set<infer M>
  ? ImmutableSet<M>
  : ImmutableObject<T>;

type ImmutablePrimitive =
  | undefined
  | null
  | boolean
  | string
  | number
  | Function;

export type ImmutableArray<T> = ReadonlyArray<Immutable<T>>;
export type ImmutableMap<K, V> = ReadonlyMap<Immutable<K>, Immutable<V>>;
export type ImmutableSet<T> = ReadonlySet<Immutable<T>>;
export type ImmutableObject<T> = { readonly [K in keyof T]: Immutable<T[K]> };

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
