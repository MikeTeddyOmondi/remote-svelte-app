<script lang="ts">
	import { getTasks, createTask, toggleTask, deleteTask } from '$lib/functions/tasks.remote';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Field from '$lib/components/ui/field/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import ListTodoIcon from '@lucide/svelte/icons/list-todo';

	let { data } = $props();

	// A bare `await` in $derived (enabled by compilerOptions.experimental.async)
	// resolves during SSR, so the list is in the HTML. Neither `{#await ...}` nor
	// a <svelte:boundary> with a `pending` snippet does that — both render their
	// pending branch on the server and only fill in after hydration, which would
	// leave the list empty for anyone without JavaScript.
	const tasks = $derived(await getTasks());
</script>

<svelte:head><title>Dashboard</title></svelte:head>

<div class="mb-8">
	<h1 class="text-2xl font-semibold tracking-tight">
		Hello{data.user.name ? `, ${data.user.name}` : ''}
	</h1>
	<p class="text-muted-foreground text-sm">{data.user.email}</p>
</div>

<Card.Root>
	<Card.Header>
		<Card.Title>Tasks</Card.Title>
		<Card.Description>Stored in D1, read and written via remote functions.</Card.Description>
	</Card.Header>

	<Card.Content class="flex flex-col gap-6">
		<!--
			`createTask.enhance` lets us reset the input after a successful submit;
			without it the form keeps whatever was typed.
		-->
		<form
			{...createTask.enhance(async (form) => {
				await form.submit();
				form.element.reset();
			})}
		>
			<Field.Field data-invalid={createTask.fields.title.issues() ? true : undefined}>
				<div class="flex gap-2">
					<Input
						placeholder="What needs doing?"
						aria-label="Task title"
						{...createTask.fields.title.as('text')}
					/>
					<Button type="submit" disabled={!!createTask.pending}>Add</Button>
				</div>
				{#each createTask.fields.title.issues() ?? [] as issue (issue.message)}
					<Field.Error>{issue.message}</Field.Error>
				{/each}
			</Field.Field>
		</form>

		{#if tasks.length === 0}
				<Empty.Root class="border-none">
					<Empty.Header>
						<Empty.Media variant="icon"><ListTodoIcon /></Empty.Media>
						<Empty.Title>Nothing here yet</Empty.Title>
						<Empty.Description>Add your first task above.</Empty.Description>
					</Empty.Header>
				</Empty.Root>
			{:else}
				<ul class="flex flex-col">
					{#each tasks as task, i (task.id)}
						{@const toggle = toggleTask.for(task.id)}
						{@const remove = deleteTask.for(task.id)}

						{#if i > 0}
							<Separator />
						{/if}

						<li class="flex items-center gap-3 py-3">
							<!--
								Each row is its own form instance via `.for(task.id)`, so a
								pending toggle on one row doesn't disable the others.
							-->
							<form {...toggle} class="flex items-center">
								<input {...toggle.fields.id.as('hidden', task.id)} />
								<input {...toggle.fields.done.as('hidden', task.done)} />
								<Checkbox
									checked={task.done}
									aria-label={task.done ? 'Mark as not done' : 'Mark as done'}
									onCheckedChange={() => toggle.element?.requestSubmit()}
								/>
							</form>

							<span
								class="flex-1 text-sm"
								class:line-through={task.done}
								class:text-muted-foreground={task.done}
							>
								{task.title}
							</span>

							<form {...remove}>
								<input {...remove.fields.id.as('hidden', task.id)} />
								<Button
									type="submit"
									variant="ghost"
									size="icon"
									aria-label="Delete task"
									disabled={!!remove.pending}
								>
									<Trash2Icon class="size-4" />
								</Button>
							</form>
						</li>
					{/each}
			</ul>
		{/if}
	</Card.Content>
</Card.Root>
