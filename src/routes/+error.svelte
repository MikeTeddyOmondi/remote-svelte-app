<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button/index.js';
	import ThemeToggle from '$lib/components/theme-toggle.svelte';
</script>

<svelte:head><title>{page.status} · remote-svelte-app</title></svelte:head>

<div class="flex min-h-svh flex-col">
	<div class="flex justify-end p-4"><ThemeToggle /></div>

	<main class="flex flex-1 flex-col items-center justify-center gap-4 px-4 pb-16 text-center">
		<p class="text-muted-foreground font-mono text-sm">{page.status}</p>
		<h1 class="text-2xl font-semibold tracking-tight text-balance">
			{page.error?.message ?? 'Something went wrong'}
		</h1>
		<Button href="/" variant="outline" class="mt-2">Back to safety</Button>
	</main>
</div>
