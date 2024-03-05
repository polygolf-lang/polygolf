const cachedStringification = new WeakMap<object, string>();
export function stringify(x: object, skipTargetType = false): string {
  if (cachedStringification.has(x)) return cachedStringification.get(x)!;
  const result = JSON.stringify(
    x,
    (key, value) =>
      key === "source"
        ? undefined
        : key === "targetType" && skipTargetType
        ? undefined
        : typeof value === "bigint"
        ? value.toString() + "n"
        : value,
    2,
  );
  cachedStringification.set(x, result);
  return result;
}
