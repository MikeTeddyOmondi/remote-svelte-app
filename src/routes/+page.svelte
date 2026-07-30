<script lang="ts">
	import Nav from '$lib/components/nav.svelte';
	import { Button } from '$lib/components/ui/button/index.js';

	let { data } = $props();
</script>

<svelte:head><title>remote-svelte-app</title></svelte:head>

<div class="flex min-h-svh flex-col">
	<Nav user={data.user} />

	<main class="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-16">
		<h1 class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
			SvelteKit remote functions on Cloudflare
		</h1>
		<p class="text-muted-foreground mt-4 max-w-prose text-pretty">
			Better Auth for sessions, D1 + Drizzle for storage, and
			<code class="text-foreground text-sm">query</code> /
			<code class="text-foreground text-sm">form</code> remote functions instead of
			<code class="text-foreground text-sm">+page.server.ts</code> actions.
		</p>

		<div class="mt-8 flex gap-3">
			{#if data.user}
				<Button href="/dashboard">Go to dashboard</Button>
			{:else}
				<Button href="/register">Get started</Button>
				<Button href="/login" variant="outline">Sign in</Button>
			{/if}
		</div>
	</main>
</div>
