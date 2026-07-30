import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// SvelteKit options (adapter, compilerOptions, experimental flags) live in
// svelte.config.js.
export default defineConfig({
	plugins: [tailwindcss(), sveltekit()]
});
