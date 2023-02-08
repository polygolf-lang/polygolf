// https://github.com/nim-lang/Nim/blob/version-1-6/lib/pure/hashes.nim#L302
function rotl32(x: number, r: number): number {
  return (x << r) | (x >>> (32 - r));
}

function hash(text: string): number {
  const x = Buffer.from(text, "utf8");
  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;
  const n1 = 0xe6546b64;
  const m1 = 0x85ebca6b;
  const m2 = 0xc2b2ae35;

  const size = x.length;
  const stepSize = 4;
  const n = Math.floor(size / stepSize);

  let h1 = 0;
  let i = 0;
  let k1 = 0;

  // body
  while (i < n * stepSize) {
    k1 = 0;
    let j = stepSize;
    while (j-- > 0) {
      k1 = (k1 << 8) | x[i + j];
    }
    i += stepSize;

    k1 = Math.imul(k1, c1);
    k1 = rotl32(k1, 15);
    k1 = Math.imul(k1, c2);

    h1 = h1 ^ k1;
    h1 = rotl32(h1, 13);
    h1 = h1 * 5 + n1;
  }

  // tail
  k1 = 0;
  let rem = size % stepSize;
  while (rem-- > 0) {
    k1 = (k1 << 8) | x[i + rem];
  }
  k1 = Math.imul(k1, c1);
  k1 = rotl32(k1, 15);
  k1 = Math.imul(k1, c2);
  h1 = h1 ^ k1;

  // finalization
  h1 = h1 ^ size;
  h1 = h1 ^ (h1 >>> 16);
  h1 = Math.imul(h1, m1);
  h1 = h1 ^ (h1 >>> 13);
  h1 = Math.imul(h1, m2);
  h1 = h1 ^ (h1 >>> 16);
  return (h1 + 2 ** 32) % 2 ** 32;
}

export default hash;
