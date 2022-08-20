/**
 * @type {import('@jest/types').Config.ProjectConfig}
 */
module.exports = {
  preset: "ts-jest",
  transform: {
    "^.+\\.ts$": ["ts-jest"],
  },
  testPathIgnorePatterns: ["<rootDir>/node_modules/"],
  moduleDirectories: ["node_modules", "src"],
};
