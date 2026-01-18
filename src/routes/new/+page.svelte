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
	<title>새 사이트 만들기 | Replica Builder</title>
	<meta name="description" content="템플릿을 선택하고 새 문서 사이트를 만드세요" />
</svelte:head>

<main class="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 px-4 py-12">
	<div class="mx-auto max-w-3xl">
		<div class="mb-8 flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold text-white">새 사이트 만들기</h1>
				<p class="mt-1 text-slate-400">템플릿을 선택하세요</p>
			</div>
			<a href={resolve('/')} class="text-sm text-slate-400 transition hover:text-white">
				← 홈으로
			</a>
		</div>

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
