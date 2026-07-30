type Issue = { message: string };

type HasIssues = { issues: () => Issue[] | undefined };
type HasAllIssues = { allIssues: () => Issue[] | undefined };

/**
 * Splits a remote form's validation issues into the ones already shown against
 * a specific input and the ones that belong to the form as a whole.
 *
 * A remote `form` surfaces schema failures per-field via `fields.x.issues()`,
 * but `invalid('...')` calls from the handler — Better Auth's "Invalid email or
 * password", say, which deliberately won't tell you which of the two was wrong
 * — have no field to attach to and only ever appear in `fields.allIssues()`.
 * Rendering `allIssues()` wholesale therefore repeats every inline message in
 * the summary alert.
 *
 * This subtracts the inline messages so the alert shows only what isn't already
 * displayed next to an input.
 *
 * ```svelte
 * const fields = $derived(signIn.fields);
 * const formIssues = useFormIssues(
 *   () => fields,
 *   () => [fields.email, fields._password]
 * );
 * ```
 */
export function useFormIssues(form: () => HasAllIssues, inline: () => HasIssues[]) {
	const current = $derived.by(() => {
		const shown = new Set(
			inline()
				.flatMap((field) => field.issues() ?? [])
				.map((issue) => issue.message)
		);

		return (form().allIssues() ?? []).filter((issue) => !shown.has(issue.message));
	});

	return {
		get current() {
			return current;
		}
	};
}
