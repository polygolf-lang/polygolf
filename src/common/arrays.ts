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

export function groupConsecutive<T>(
  data: T[],
  predicate: (a: T, b: T) => boolean
): T[][] {
  if (data.length < 1) return [];
  const result: T[][] = [];
  let last: T[] = [data[0]];
  data.forEach((x, xi) => {
    if (xi > 0) {
      if (predicate(last.at(-1)!, x)) {
        last.push(x);
      } else {
        result.push(last);
        last = [x];
      }
    }
  });
  result.push(last);
  return result;
}

export function groupConsecutiveBy<T, Tkey>(
  data: T[],
  key: (a: T) => Tkey
): T[][] {
  return groupConsecutive(data, (a: T, b: T) => key(a) === key(b));
}
