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

To enable it, set `LOCCI_CLIENT_ID`. The button only renders when a client ID is configured, and
`LOCCI_CLIENT_SECRET` stays empty for a public PKCE client.

Better Auth derives the callback from `baseURL` — `${baseURL}/api/auth/oauth2/callback/locci-auth` —
and `baseURL` is `ORIGIN || <request origin>`. So the `redirect_uri` differs per environment, and the
issuer must accept **every** one you use:

| Environment | `redirect_uri` sent to Locci |
| --- | --- |
| `pnpm dev` | `http://localhost:5173/api/auth/oauth2/callback/locci-auth` |
| production | `https://remote-svelte-app.locci.cloud/api/auth/oauth2/callback/locci-auth` |

> `pnpm preview` runs `wrangler dev` on **:8787**, but `.dev.vars` sets `ORIGIN` to :5173 — and
> `ORIGIN` wins over the request origin. To exercise Locci under `preview`, set
> `ORIGIN=http://localhost:8787` in `.dev.vars` and register that URI too.

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
| `pnpm run deploy` | build and deploy — **`pnpm deploy` will not work**, see below |

### A note on `pnpm check`

`svelte-check` discovers files by walking the filesystem and ignores `exclude` in `tsconfig.json`, so
a previous `pnpm build` leaves generated bundles lying around for it to find. Two guards keep the
output honest:

- `check` runs `pnpm clean` first to drop `.svelte-kit/output`.
- `checkJs` is `false`, so the bundles the Cloudflare adapter emits are not type-checked. They cannot
  just be deleted — `wrangler types` embeds a reference to `.svelte-kit/cloudflare/_worker` in the
  hash it verifies, so removing that directory makes `wrangler types --check` fail.

Run `pnpm gen` whenever you change bindings or vars in `wrangler.jsonc` or add a key to `.dev.vars`.

## Deploying

Live at **https://remote-svelte-app.locci.cloud**. The custom domain is attached by the `routes` block
in `wrangler.jsonc`; it requires `locci.cloud` to be a zone on the same Cloudflare account.

> **The host must stay under `locci.cloud`.** The OpenAuth issuer at `auth.locci.cloud` does not
> define an `allow` callback, so it uses OpenAuth's default: a `redirect_uri` is permitted only if its
> hostname is `localhost`/`127.0.0.1`, or shares the issuer's last two labels. The app was first
> deployed to `remote-svelte-app.mt0.dev` and every Locci sign-in failed with `unauthorized_client`.
> Moving it under `locci.cloud` is what fixed it — `ORIGIN` and `routes` must move together, since
> `ORIGIN` is what derives the `redirect_uri`.

```sh
pnpm run deploy   # NOT `pnpm deploy`
```

> `pnpm deploy` is a **built-in pnpm command** for deploying a workspace package. Because this repo has
> a `pnpm-workspace.yaml`, pnpm intercepts it and fails with `ERR_PNPM_NOTHING_TO_DEPLOY` — it never
> reaches the `deploy` script. Always use `pnpm run deploy`.

### Production configuration

| Value | Where | Notes |
| --- | --- | --- |
| `ORIGIN` | `vars` in `wrangler.jsonc` | Drives Better Auth's cookies, CSRF, and the OAuth `redirect_uri` |
| `LOCCI_CLIENT_ID` | `vars` in `wrangler.jsonc` | Public OAuth identifier, not a secret |
| `BETTER_AUTH_SECRET` | `wrangler secret put` | Takes effect immediately, no redeploy |
| `LOCCI_CLIENT_SECRET` | — | Unset: Locci is a public PKCE client |
| `CLOUDFLARE_*` | **local `.env` only** | Never deploy these — see below |

Set or rotate the secret (rotating invalidates every session):

```sh
openssl rand -base64 32 | wrangler secret put BETTER_AUTH_SECRET
```

> Do **not** upload `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_DATABASE_ID`, or `CLOUDFLARE_D1_TOKEN`. They
> exist purely so `drizzle-kit studio` can reach remote D1 from your machine. `CLOUDFLARE_D1_TOKEN`
> can read and write every D1 database on the account; putting it in the Worker would expose that to
> any code-execution bug for no benefit.

**Migrations do not run on deploy.** Run `pnpm db:migrate:remote` yourself before shipping a release
that depends on a schema change.

### Continuous deployment (Workers Builds)

`wrangler` cannot connect a Git repo — this is done in the dashboard, and the Worker must already
exist (deploy manually once first).

1. Dashboard → **Workers & Pages** → `remote-svelte-app` → **Settings** → **Build**
2. **Connect** → authorise the Cloudflare GitHub App → pick `MikeTeddyOmondi/remote-svelte-app`
3. Branch `main`, root directory `/`
4. Build command: `pnpm run build`
5. Deploy command: `npx wrangler deploy`

Two things that would otherwise break the first build:

- The build must not depend on `.dev.vars`, which is gitignored. `build` is therefore plain
  `vite build` — `wrangler types --check` lives in `pnpm check` instead, because `wrangler types`
  derives `Env` from `.dev.vars` and would report "types are out of date" on every CI run.
- Secrets are not in the repo. `BETTER_AUTH_SECRET` is already stored on the Worker and persists
  across deploys, so CI needs nothing extra.

## UI

[shadcn-svelte](https://shadcn-svelte.com) (`components.json`, zinc base) with Tailwind v4.
Theme tokens live in `src/routes/layout.css`.

`@tailwindcss/forms` is deliberately **not** installed — its base resets fight shadcn-svelte's
input and checkbox styling.
