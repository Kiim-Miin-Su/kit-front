import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [".next/**", ".history/**", "node_modules/**"],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../*"],
              message: "Use @/ imports for cross-directory modules under src.",
            },
          ],
        },
      ],
    },
  },
];

export default config;
