# remote-svelte-app

SvelteKit on Cloudflare Workers: **Better Auth** for sessions, **D1 + Drizzle** for storage, and
SvelteKit **remote functions** (`query` / `form`) instead of `+page.server.ts` actions.

## Setup

```sh
pnpm install
cp .env.example .env            # read by `vite dev` and drizzle-kit
cp .dev.vars.example .dev.vars  # read by `wrangler dev` and mirrors production
pnpm db:migrate:local           # REQUIRED — see "Migrations" below
pnpm dev
```

Generate `BETTER_AUTH_SECRET` with `openssl rand -base64 32`. It must be set in **both** files.

### Why two env files

| Command | `$env/dynamic/private` resolves from |
| --- | --- |
| `vite dev` | `.env` |
| `wrangler dev` (`pnpm preview`) | `.dev.vars` |
| deployed Worker | `vars` in `wrangler.jsonc` + `wrangler secret put` |

Setting only `.env` makes auth work in dev and fail everywhere else.

## Migrations

> **Author with `drizzle-kit`, apply with `wrangler`.**

`drizzle.config.ts` uses `driver: 'd1-http'`, which talks to the **remote** database only. It cannot
reach the local miniflare D1 that `vite dev` and `wrangler dev` use. Running `drizzle-kit
push`/`migrate` therefore leaves your local database empty, and every sign-up fails with
`no such table: user`.

```sh
pnpm db:generate        # author a migration from src/lib/server/db/schema.ts
pnpm db:migrate:local   # apply to the local miniflare D1
pnpm db:migrate:remote  # apply to the real D1
```

Inspect the local database:

```sh
pnpm db:studio:local   # Drizzle Studio against the local miniflare D1
npx wrangler d1 execute remote-svelte-app --local --command "select * from user"
```

`db:studio:remote` uses `drizzle.config.ts` (`driver: 'd1-http'`) and shows the **deployed** database.
Since there is no local D1 driver, `db:studio:local` uses `drizzle.local.config.ts`, which points the
plain `sqlite` dialect at miniflare's SQLite file via `@libsql/client`. Both default to port 4983, so
pass `--port` if you want to run them side by side.

## Auth

Wiring lives in three files:

- `src/lib/server/auth.ts` — the Better Auth instance, built per request via `createAuth(d1, origin)`.
  Uses `better-auth/minimal` because the default entrypoint pulls in Kysely, which cannot run on Workers.
- `src/hooks.server.ts` — puts the instance on `locals.auth`, resolves `locals.user` / `locals.session`,
  and serves Better Auth's own routes under `/api/auth/*`.
- `src/lib/auth.remote.ts` — `signIn` / `signUp` / `signOut` / `signInWithLocci` as remote `form`s.

Sign-in must be a `form` (or `command`), never a `query`: remote functions may only write cookies
from `form` and `command`, and the session cookie is the entire point.

### Sign in with Locci

Locci runs [OpenAuth](https://openauth.js.org) at `https://auth.locci.cloud`, which is plain OAuth 2.0
— **not** OpenID Connect. It has no `userinfo_endpoint` and issues no `id_token`, so Better Auth has
nowhere to fetch a profile from. `src/lib/server/locci.ts` therefore supplies a custom `getUserInfo`
that verifies the ES256-signed access token against the issuer's JWKS and reads the subject's
`properties` claim.

To enable it, set `LOCCI_CLIENT_ID` and register this redirect URI with the issuer:

```
<ORIGIN>/api/auth/oauth2/callback/locci-auth
```

`LOCCI_CLIENT_SECRET` is optional — leave it empty for a public PKCE client. The button only renders
when a client ID is configured.

> The Locci subject **must** carry an `email` claim; Better Auth requires one on the user row.
> `getLocciUserInfo` throws a descriptive error rather than inventing a placeholder address.

## Remote functions

Enabled via `kit.experimental.remoteFunctions` and `compilerOptions.experimental.async` in
`svelte.config.js`.

**Remote functions are their own HTTP endpoints.** A `+layout.server.ts` guard does not protect them,
and `url` / `route` / `params` inside them describe the *calling page*, so they can never be used for
authorization. Every function touching user data calls `requireUser()` from
`src/lib/server/auth-guard.ts`, and every task mutation scopes its `WHERE` clause by `user_id`.

To keep data in the server-rendered HTML, `await` remote queries in a `$derived`:

```svelte
const tasks = $derived(await getTasks());
```

Neither `{#await ...}` nor `<svelte:boundary>` with a `pending` snippet will do — both render their
pending branch during SSR and only fill in after hydration, leaving the page empty without JavaScript.

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Vite dev server |
| `pnpm build` / `pnpm preview` | production build / run it under `wrangler dev` |
| `pnpm check` | `wrangler types --check` + `svelte-check` |
| `pnpm clean` | remove `.svelte-kit/output` (run by `check`; see below) |
| `pnpm gen` | regenerate `worker-configuration.d.ts` after changing bindings or vars |
| `pnpm db:generate` | author a Drizzle migration |
| `pnpm db:migrate:local` / `db:migrate:remote` | apply migrations |
| `pnpm db:studio:local` / `db:studio:remote` | Drizzle Studio against local miniflare D1 / deployed D1 |
| `pnpm auth:schema` | regenerate the Better Auth Drizzle schema |
| `pnpm deploy` | build and deploy |

### A note on `pnpm check`

`svelte-check` discovers files by walking the filesystem and ignores `exclude` in `tsconfig.json`, so
a previous `pnpm build` leaves generated bundles lying around for it to find. Two guards keep the
output honest:

- `check` runs `pnpm clean` first to drop `.svelte-kit/output`.
- `checkJs` is `false`, so the bundles the Cloudflare adapter emits are not type-checked. They cannot
  just be deleted — `wrangler types` embeds a reference to `.svelte-kit/cloudflare/_worker` in the
  hash it verifies, so removing that directory makes `wrangler types --check` fail.

Run `pnpm gen` whenever you change bindings or vars in `wrangler.jsonc` or add a key to `.dev.vars`.

## UI

[shadcn-svelte](https://shadcn-svelte.com) (`components.json`, zinc base) with Tailwind v4.
Theme tokens live in `src/routes/layout.css`.

`@tailwindcss/forms` is deliberately **not** installed — its base resets fight shadcn-svelte's
input and checkbox styling.
