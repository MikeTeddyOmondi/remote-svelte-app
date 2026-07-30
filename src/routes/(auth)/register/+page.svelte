<script lang="ts">
	import { signUp, signInWithLocci } from '$lib/functions/auth.remote';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import * as Alert from '$lib/components/ui/alert/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { useFormIssues } from '$lib/hooks/form-issues.svelte.js';
	import AlertCircleIcon from '@lucide/svelte/icons/circle-alert';

	let { data } = $props();

	const fields = $derived(signUp.fields);
	const formIssues = useFormIssues(
		() => fields,
		() => [fields.name, fields.email, fields._password]
	);
</script>

<svelte:head><title>Create an account</title></svelte:head>

<Card.Root>
	<Card.Header>
		<Card.Title class="text-xl">Create an account</Card.Title>
		<Card.Description>It takes about ten seconds.</Card.Description>
	</Card.Header>

	<Card.Content>
		{#if formIssues.current.length > 0}
			<Alert.Root variant="destructive" class="mb-6">
				<AlertCircleIcon />
				<Alert.Description>
					{#each formIssues.current as issue (issue.message)}
						<p>{issue.message}</p>
					{/each}
				</Alert.Description>
			</Alert.Root>
		{/if}

		<form {...signUp}>
			<Field.Group>
				<Field.Field data-invalid={fields.name.issues() ? true : undefined}>
					<Field.Label for="name">Name</Field.Label>
					<Input id="name" autocomplete="name" {...fields.name.as('text')} />
					{#each fields.name.issues() ?? [] as issue (issue.message)}
						<Field.Error>{issue.message}</Field.Error>
					{/each}
				</Field.Field>

				<Field.Field data-invalid={fields.email.issues() ? true : undefined}>
					<Field.Label for="email">Email</Field.Label>
					<Input id="email" autocomplete="email" {...fields.email.as('email')} />
					{#each fields.email.issues() ?? [] as issue (issue.message)}
						<Field.Error>{issue.message}</Field.Error>
					{/each}
				</Field.Field>

				<Field.Field data-invalid={fields._password.issues() ? true : undefined}>
					<Field.Label for="password">Password</Field.Label>
					<Input
						id="password"
						autocomplete="new-password"
						{...fields._password.as('password')}
					/>
					<Field.Description>At least 8 characters.</Field.Description>
					{#each fields._password.issues() ?? [] as issue (issue.message)}
						<Field.Error>{issue.message}</Field.Error>
					{/each}
				</Field.Field>

				<Button type="submit" class="w-full" disabled={!!signUp.pending}>
					{signUp.pending ? 'Creating account…' : 'Create account'}
				</Button>
			</Field.Group>
		</form>

		{#if data.locci}
			<div class="relative my-6">
				<Separator />
				<span
					class="bg-card text-muted-foreground absolute inset-0 -top-2 mx-auto w-fit px-2 text-xs"
				>
					or
				</span>
			</div>

			<form {...signInWithLocci}>
				<Button
					type="submit"
					variant="outline"
					class="w-full"
					disabled={!!signInWithLocci.pending}
				>
					Continue with Locci
				</Button>
			</form>
		{/if}
	</Card.Content>

	<Card.Footer>
		<p class="text-muted-foreground w-full text-center text-sm">
			Already have an account?
			<a href="/login" class="text-foreground underline underline-offset-4">Sign in</a>
		</p>
	</Card.Footer>
</Card.Root>
