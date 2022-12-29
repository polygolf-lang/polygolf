/**
 * @type {import('@jest/types').Config.ProjectConfig}
 */
module.exports = {
  preset: "ts-jest",
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec|test.md))\\.[jt]sx?$",
  transform: {
    "^.+\\.ts$": ["ts-jest"],
  },
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/dist/"],
  moduleDirectories: ["node_modules", "src"],
  moduleNameMapper: {
    "@/(.*)": "<rootDir>/src/$1",
  },
};
