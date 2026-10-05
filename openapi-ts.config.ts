import { defineConfig } from '@hey-api/openapi-ts'

/**
 * Generates the typed API client in `src/client` from the FruitMail
 * OpenAPI specification, served by the mail server itself.
 *
 * API reference: https://mail-server.fruitice.fr/#description/introduction
 *
 * Run with: npm run generate:api
 */
export default defineConfig({
  input: 'https://mail-server.fruitice.fr/openapi.json',
  output: './src/client',
  plugins: [
    // the fetch client runtime is bundled into the generated output
    // (`src/client/client` + `src/client/core`), so the app needs no
    // `@hey-api/client-fetch` runtime dependency
    '@hey-api/client-fetch',
    '@hey-api/typescript',
    '@hey-api/sdk',
  ],
})
