import type { Config } from "@jest/types";

export default (): Config.InitialOptions => {
  return {
    clearMocks: true,
    moduleFileExtensions: ["js", "jsx", "ts", "tsx"],
    roots: ["<rootDir>/src"],
    testPathIgnorePatterns: [],
    testEnvironment: "node",
    transform: { "^.+\\.tsx?$": "ts-jest" },
    globals: { "ts-jest": { tsconfig: "tsconfig.json" } },
    testRegex: "(/test/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
  };
};
