import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Hexagonal boundary (TECH_SPEC §2.3): domain + application must not import infrastructure
  // adapters or vendor SDKs directly — only ports. SDKs live behind adapters in infrastructure/.
  {
    files: ["src/domain/**/*.ts", "src/application/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/infrastructure/*"], message: "Domain/application must depend on ports, not infrastructure adapters." },
            { group: ["@/composition/*"], message: "Do not import the composition root from domain/application." },
            {
              group: [
                "@ai-sdk/*", "ai", "drizzle-orm", "postgres", "@aws-sdk/*",
                "@upstash/*", "@clerk/*", "mammoth", "unpdf", "next", "next/*",
              ],
              message: "No vendor SDKs in domain/application — wrap them in an infrastructure adapter behind a port.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
