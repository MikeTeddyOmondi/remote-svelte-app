<script lang="ts">
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import { signOut } from '$lib/functions/auth.remote';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import ThemeToggle from './theme-toggle.svelte';

	type SessionUser = {
		id: string;
		name?: string | null;
		email: string;
		image?: string | null;
	};

	let { user }: { user: SessionUser | null } = $props();

	const initials = $derived(
		(user?.name || user?.email || '?')
			.split(/[\s@.]+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase())
			.join('')
	);
</script>

<header class="border-b">
	<nav class="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
		<a href="/" class="font-semibold tracking-tight">remote-svelte-app</a>

		<div class="ml-auto flex items-center gap-1">
			<ThemeToggle />

			{#if user}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<button
								{...props}
								class="ml-1 rounded-full focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
								aria-label="Account menu"
							>
								<Avatar.Root class="size-8">
									{#if user.image}
										<Avatar.Image src={user.image} alt="" />
									{/if}
									<Avatar.Fallback class="text-xs">{initials}</Avatar.Fallback>
								</Avatar.Root>
							</button>
						{/snippet}
					</DropdownMenu.Trigger>

					<DropdownMenu.Content align="end" class="w-56">
						<DropdownMenu.Label class="font-normal">
							<div class="flex flex-col gap-0.5">
								{#if user.name}
									<span class="text-sm font-medium">{user.name}</span>
								{/if}
								<span class="text-muted-foreground truncate text-xs">{user.email}</span>
							</div>
						</DropdownMenu.Label>
						<DropdownMenu.Separator />
						<DropdownMenu.Item closeOnSelect={false}>
							{#snippet child({ props })}
								<!--
									A real <form> rather than an onclick handler, so signing out
									still works with JavaScript unavailable.
								-->
								<form {...signOut} class="contents">
									<button {...props} type="submit" class="w-full">
										<LogOutIcon class="size-4" />
										Sign out
									</button>
								</form>
							{/snippet}
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{:else}
				<Button href="/login" variant="ghost" size="sm">Sign in</Button>
				<Button href="/register" size="sm">Sign up</Button>
			{/if}
		</div>
	</nav>
</header>
