import { decomposeInt } from "./arithmetic";

test("decomposeInt", () => {
  for (const int of [
    [-3, 2, 29, 1],
    [3, 2, 29, -10],
    [-1, 2, 18, 8],
    [58, 10, 17, -1],
    [-1, 10, 10, 1],
    [5, 10, 40, -58],
    [1, 2, 18, 0],
    [1, 4, 9, 0],
    [6, 2, 99, 0],
  ]) {
    const [k, b, e, d] = int.map(BigInt);
    expect(
      decomposeInt(k * b ** e + d).map((x) => x.map(Number).slice(0, 4))
    ).toEqual(expect.arrayContaining([int]));
  }
});
