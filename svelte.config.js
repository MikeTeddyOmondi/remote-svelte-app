import adapter from '@sveltejs/adapter-cloudflare';

/**
 * Previously these options were inlined in `vite.config.ts`. They live here
 * because `kit.experimental.remoteFunctions` and
 * `compilerOptions.experimental.async` must be set in the SvelteKit config, and
 * because tooling (shadcn-svelte's CLI among it) reads `svelte.config.js` to
 * resolve the `$lib` alias.
 *
 * @type {import('@sveltejs/kit').Config}
 */
const config = {
	kit: {
		adapter: adapter(),
		experimental: {
			// Enables `query`/`form`/`command` in *.remote.ts files.
			remoteFunctions: true
		},
		typescript: {
			config: (config) => {
				config.include.push('../drizzle.config.ts');
			}
		}
	},
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) =>
			filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
		experimental: {
			// Required to `await` remote functions directly in markup.
			async: true
		}
	}
};

export default config;
