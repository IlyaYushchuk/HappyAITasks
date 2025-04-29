/** @type {import("eslint").Linter.Config} */
const config = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
  ],
  rules: {
    "@typescript-eslint/array-type": "off",
    "@typescript-eslint/consistent-type-definitions": "off",
    "@typescript-eslint/consistent-type-imports": [
      "warn",
      {
        prefer: "type-imports",
        fixStyle: "inline-type-imports",
      },
    ],
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/require-await": "off",
    // Отключаем no-floating-promises, так как используем no-misused-promises
    "@typescript-eslint/no-floating-promises": "off",
    // Настраиваем no-misused-promises для игнорирования onClick
    "@typescript-eslint/no-misused-promises": [
      "error",
      {
        checksVoidReturn: {
          // Отключаем проверку для атрибутов, таких как onClick
          attributes: false,
          // Отключаем проверку для аргументов (на случай других обработчиков)
          arguments: false,
        },
      },
    ],
  },
};

module.exports = config;