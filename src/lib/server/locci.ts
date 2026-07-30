import { createRemoteJWKSet, jwtVerify, decodeJwt, type JWTPayload } from 'jose';
import type { GenericOAuthConfig } from 'better-auth/plugins/generic-oauth';

// Derived from the plugin's own config type rather than imported from
// `@better-auth/core/oauth2`, which is a transitive dep and not resolvable here.
type GetUserInfo = NonNullable<GenericOAuthConfig['getUserInfo']>;
type OAuth2Tokens = Parameters<GetUserInfo>[0];
type OAuth2UserInfo = NonNullable<Awaited<ReturnType<GetUserInfo>>>;

export const LOCCI_ISSUER = 'https://auth.locci.cloud';
export const LOCCI_PROVIDER_ID = 'locci-auth';

/**
 * Locci runs SST OpenAuth, which is plain OAuth 2.0 — NOT OpenID Connect.
 * Probing the issuer shows:
 *
 *   /.well-known/oauth-authorization-server -> 200 (authorize, token, jwks_uri)
 *   /.well-known/openid-configuration       -> 404  => no `id_token`
 *   userinfo_endpoint                       -> absent
 *
 * So Better Auth has no endpoint to fetch a profile from and no ID token to
 * read it out of. The profile therefore has to come from the access token
 * itself, which OpenAuth issues as an ES256-signed JWT carrying the subject's
 * `properties`. That is what `getUserInfo` below does.
 */

/**
 * Module-scoped so the JWKS is fetched once and cached across requests. `jose`
 * handles `kid` selection (the issuer publishes ~75 keys) and refetches on miss.
 */
const jwks = createRemoteJWKSet(new URL(`${LOCCI_ISSUER}/.well-known/jwks.json`));

/** Claim shape OpenAuth puts in its access tokens. */
type LocciAccessToken = JWTPayload & {
	mode?: string;
	type?: string;
	properties?: Record<string, unknown>;
};

const str = (v: unknown): string | undefined =>
	typeof v === 'string' && v.length > 0 ? v : undefined;

/**
 * Verifies the OpenAuth access token and maps its claims onto the shape Better
 * Auth expects. Throws on an unverifiable token — never fall back to decoding
 * without verification, since the claims decide which account is signed in.
 */
export async function getLocciUserInfo(tokens: OAuth2Tokens): Promise<OAuth2UserInfo | null> {
	const accessToken = tokens.accessToken;
	if (!accessToken) return null;

	const { payload } = await jwtVerify<LocciAccessToken>(accessToken, jwks, {
		issuer: LOCCI_ISSUER
	});

	// OpenAuth nests app-defined subject fields under `properties`; tolerate a
	// flat payload too, in case the issuer is configured differently.
	const props = (payload.properties ?? {}) as Record<string, unknown>;
	const pick = (...keys: string[]): string | undefined => {
		for (const k of keys) {
			const v = str(props[k]) ?? str((payload as Record<string, unknown>)[k]);
			if (v) return v;
		}
		return undefined;
	};

	const id = pick('id', 'userID', 'userId', 'sub') ?? str(payload.sub);
	if (!id) {
		throw new Error('Locci access token contained no subject identifier');
	}

	const email = pick('email', 'emailAddress');
	if (!email) {
		// Better Auth requires an email on the user row. Failing loudly here is
		// far better than silently creating an account with a synthetic address
		// that can never receive mail or be linked correctly later.
		throw new Error(
			`Locci access token for subject "${id}" contained no email claim. ` +
				`Add \`email\` to the subject properties on the Locci issuer, ` +
				`or adjust getLocciUserInfo() to synthesise one deliberately.`
		);
	}

	return {
		id,
		email,
		name: pick('name', 'username', 'displayName', 'given_name') ?? email,
		image: pick('image', 'avatar', 'picture'),
		// The issuer is the authority on this address, so treat it as verified.
		emailVerified: true
	};
}

/**
 * Decodes without verifying — for logging/debugging a token by hand only.
 * Never use this to make an authorization decision.
 */
export const unsafeDecodeLocciToken = (token: string) => decodeJwt<LocciAccessToken>(token);

type LocciEnv = { LOCCI_CLIENT_ID?: string; LOCCI_CLIENT_SECRET?: string };

export function locciProvider(env: LocciEnv): GenericOAuthConfig {
	return {
		providerId: LOCCI_PROVIDER_ID,
		discoveryUrl: `${LOCCI_ISSUER}/.well-known/oauth-authorization-server`,
		clientId: env.LOCCI_CLIENT_ID ?? 'remote-svelte-app',
		// Optional: OpenAuth public clients authenticate with PKCE alone.
		clientSecret: env.LOCCI_CLIENT_SECRET || undefined,
		// OpenAuth *requires* PKCE, but does not advertise
		// `code_challenge_methods_supported`, so discovery cannot infer it.
		pkce: true,
		getUserInfo: getLocciUserInfo
	};
}

/** Whether Locci is configured well enough to show the button. */
export const isLocciEnabled = (env: LocciEnv) => Boolean(env.LOCCI_CLIENT_ID);
