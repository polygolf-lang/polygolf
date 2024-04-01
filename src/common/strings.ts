// This is what code.golf uses for char scoring
// https://github.com/code-golf/code-golf/blob/13733cfd472011217031fb9e733ae9ac177b234b/js/_util.ts#L7
export const charLength = (str: string | null) => {
  if (str === null) return Infinity;
  let i = 0;
  let len = 0;

  while (i < str.length) {
    const value = str.charCodeAt(i++);

    if (0xd800 <= value && value <= 0xdbff && i < str.length) {
      // It's a high surrogate, and there is a next character.
      const extra = str.charCodeAt(i++);

      // Low surrogate.
      if ((extra & 0xfc00) === 0xdc00) {
        len++;
      } else {
        // It's an unmatched surrogate; only append this code unit, in
        // case the next code unit is the high surrogate of a
        // surrogate pair.
        len++;
        i--;
      }
    } else {
      len++;
    }
  }

  return len;
};

export const codepoints = (str: string) => {
  let i = 0;
  const result: number[] = [];

  while (i < str.length) {
    const value = str.charCodeAt(i++);

    if (value >= 0xd800 && value <= 0xdbff && i < str.length) {
      // It's a high surrogate, and there is a next character.
      const extra = str.charCodeAt(i++);

      // Low surrogate.
      if ((extra & 0xfc00) === 0xdc00) {
        result.push((((value - 0xd800) << 10) ^ (extra - 0xdc00)) + 0x10000);
      } else {
        // It's an unmatched surrogate; only append this code unit, in
        // case the next code unit is the high surrogate of a
        // surrogate pair.
        result.push(value);
        i--;
      }
    } else {
      result.push(value);
    }
  }

  return result;
};

export const chars = (str: string) => {
  let i = 0;
  const result: string[] = [];

  while (i < str.length) {
    const value = str.charCodeAt(i);

    if (value >= 0xd800 && value <= 0xdbff && i + 1 < str.length) {
      // It's a high surrogate, and there is a next character.
      const extra = str.charCodeAt(i + 1);

      // Low surrogate.
      if ((extra & 0xfc00) === 0xdc00) {
        result.push(str.slice(i, i + 2));
        i += 2;
      } else {
        // It's an unmatched surrogate; only append this code unit, in
        // case the next code unit is the high surrogate of a
        // surrogate pair.
        result.push(str[i++]);
      }
    } else {
      result.push(str[i++]);
    }
  }

  return result;
};

export const byteLength = (x: string | null) =>
  x === null ? Infinity : Buffer.byteLength(x, "utf-8");

export function plainReplace(
  sourceValue: string,
  searchValue: string,
  replaceValue: string,
) {
  return sourceValue.replaceAll(
    searchValue,
    replaceValue.replaceAll("$", "$$$$"),
  );
}
