<script lang="ts">
	import Nav from '$lib/components/nav.svelte';

	let { children, data } = $props();
</script>

<div class="flex min-h-svh flex-col">
	<Nav user={data.user} />
	<main class="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
		{@render children()}
	</main>
</div>
