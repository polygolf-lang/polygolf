import hash from "./hash";

function testString(x: string, h: number) {
  test(x, () => {
    expect(hash(x)).toEqual(h);
  });
}

describe("Nim hash", () => {
  testString("", 0);
  testString("code.golf", 3712193236);
  testString("▄ ▄▄▄", 1795570265);
  testString("💎✂", 2632446085);
  testString(
    "Lorem ipsum dolor sit amet, consectetuer adipiscing elit.",
    1622063614,
  );
});
