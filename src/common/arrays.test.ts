import { useDefaults } from "./arrays";

describe("Use defaults", () => {
  const defaults = ["a", undefined, "c"];
  test("1 -> 3", () => {
    expect(useDefaults(3, defaults, ["2"])).toEqual(["a", "2", "c"]);
  });
  test("2 -> 3", () => {
    expect(useDefaults(3, defaults, ["1", "2"])).toEqual(["1", "2", "c"]);
  });
  test("3 -> 3", () => {
    expect(useDefaults(3, defaults, ["1", "2", "3"])).toEqual(["1", "2", "3"]);
  });
});
