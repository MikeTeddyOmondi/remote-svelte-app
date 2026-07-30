<script lang="ts">
	import ThemeToggle from '$lib/components/theme-toggle.svelte';

	let { children } = $props();
</script>

<div class="flex min-h-svh flex-col">
	<div class="flex justify-end p-4">
		<ThemeToggle />
	</div>

	<main class="flex flex-1 items-center justify-center px-4 pb-16">
		<div class="w-full max-w-sm">
			{@render children()}
		</div>
	</main>
</div>
