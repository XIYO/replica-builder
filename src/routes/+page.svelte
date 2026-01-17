<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import StepIndicator from '$lib/components/StepIndicator.svelte';
	import { templates, type Template } from '$lib/data/templates';

	function selectTemplate(template: Template) {
		goto(resolve(`/configure/${template.id}`));
	}
</script>

<svelte:head>
	<title>Replica Builder</title>
	<meta name="description" content="Create your documentation site instantly" />
</svelte:head>

<main class="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 px-4 py-12">
	<div class="mx-auto max-w-3xl">
		<h1 class="mb-4 text-center text-4xl font-bold text-white">Replica Builder</h1>
		<p class="mb-8 text-center text-slate-300">Create your documentation site in seconds</p>

		<StepIndicator current={1} />

		<div class="space-y-4">
			<h2 class="text-xl font-semibold text-white">템플릿 선택</h2>
			<div class="grid gap-4">
				{#each templates as template (template.id)}
					<button
						type="button"
						onclick={() => selectTemplate(template)}
						class="group flex w-full cursor-pointer items-center gap-4 rounded-xl bg-slate-800/50 p-6 text-left transition hover:bg-slate-700/50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
					>
						<div class="flex-1">
							<div class="flex items-center gap-2">
								<h3 class="text-lg font-semibold text-white">{template.name}</h3>
								<span class="rounded bg-slate-600 px-2 py-0.5 text-xs text-slate-300">
									{template.framework}
								</span>
							</div>
							<p class="mt-1 text-sm text-slate-400">{template.description}</p>
							<a
								href={template.preview}
								target="_blank"
								rel="external"
								onclick={(e) => e.stopPropagation()}
								class="mt-2 inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
							>
								미리보기
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
									/>
								</svg>
							</a>
						</div>
						<div class="text-slate-500 transition group-hover:translate-x-1 group-hover:text-white">
							<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</div>
					</button>
				{/each}
			</div>
		</div>
	</div>
</main>
