module.exports = {
    root: true,
    env: {
      node: true,
    },
    plugins: ["@typescript-eslint"],
    extends: [
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended",
    ],
    parserOptions: {
      parser: "@typescript-eslint/parser",
    },
  };
  