# FruitMail Web

Web client for the [FruitMail](https://mail.fruitice.fr) mail server. It talks
to the [FruitMail API](https://mail-server.fruitice.fr/#description/introduction)
through a fully typed [hey-api](https://heyapi.dev) client and authenticates
users with the Fruit'ice OAuth implicit flow.

## Stack

- [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) (strict)
- [Vite 8](https://vite.dev)
- [MobX 7](https://mobx.js.org) + [mobx-react-lite](https://mobx-react.js.org)
- [React Router 7](https://reactrouter.com)
- [hey-api](https://heyapi.dev) generated API client (`src/client`)

## Getting started

```sh
npm install
npm run dev
```

The dev server runs on <http://localhost:3000>. On first load the app redirects
to `https://auth.fruitice.fr` and stores the returned access token in
`localStorage` (see `src/Callback.tsx`).

## Scripts

| Script                | Description                                              |
| --------------------- | -------------------------------------------------------- |
| `npm run dev`         | Start the Vite dev server                                |
| `npm run build`       | Typecheck (`tsc -b`) and build the production bundle     |
| `npm run preview`     | Serve the production bundle locally                      |
| `npm run typecheck`   | Typecheck without building                               |
| `npm run generate:api`| Regenerate the API client from the server's OpenAPI spec |

## API client

`src/client` is **generated code** — do not edit it by hand. It is generated
from the OpenAPI specification served by the mail server
(<https://mail-server.fruitice.fr/openapi.json>) with
[`@hey-api/openapi-ts`](https://heyapi.dev), configured in
`openapi-ts.config.ts`:

```sh
npm run generate:api
```

The generated client is self-contained (the fetch runtime is bundled into
`src/client/client` and `src/client/core`), so no runtime dependency is needed.
App-wide configuration (base URL, `Authorization: Bearer` header from the
stored OAuth token, 12s request timeout) lives in `src/api.ts`.

## Project layout

```
src/
  api.ts        # hey-api client configuration, OAuth helpers, URL builders
  store.ts      # MobX store (folders, mails, user config)
  main.tsx      # entry point and route table
  App.tsx       # application shell: sidebar + routed content
  MailLayout.tsx / MailList.tsx / MailView.tsx  # reading mails
  WriteMail.tsx # composing and replying (markdown, base64 attachments)
  Callback.tsx  # OAuth implicit-flow redirect target
  client/       # generated API client (see above)
```

## Deployment

The CI (`.drone.yml`) builds the Docker image: a Node builder stage runs
`npm ci && npm run build`, and the resulting `build/` directory is served by
nginx (`nginx.conf`, SPA fallback to `index.html`).
