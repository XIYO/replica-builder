<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import StepIndicator from '$lib/components/StepIndicator.svelte';
	import { templates, type Template } from '$lib/data/templates';

	let showTemplates = $state(false);

	function selectTemplate(template: Template) {
		goto(resolve(`/configure/${template.id}`));
	}

	function startCreate() {
		showTemplates = true;
		// 부드러운 스크롤
		setTimeout(() => {
			document.getElementById('templates')?.scrollIntoView({ behavior: 'smooth' });
		}, 100);
	}
</script>

<svelte:head>
	<title>Replica Builder</title>
	<meta name="description" content="Create your documentation site instantly" />
</svelte:head>

<main class="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 px-4 py-12">
	<div class="mx-auto max-w-3xl">
		<h1 class="mb-4 text-center text-4xl font-bold text-white">Replica Builder</h1>
		<p class="mb-12 text-center text-slate-300">Create your documentation site in seconds</p>

		<!-- 메인 선택 카드 -->
		<div class="mb-12 grid gap-6 sm:grid-cols-2">
			<!-- 사이트 목록 보기 -->
			<a
				href={resolve('/sites')}
				class="group flex flex-col items-center gap-4 rounded-2xl bg-slate-800/50 p-8 transition hover:bg-slate-700/50"
			>
				<div
					class="flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 transition group-hover:bg-blue-600/30"
				>
					<svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
						/>
					</svg>
				</div>
				<div class="text-center">
					<h2 class="text-xl font-semibold text-white">사이트 목록</h2>
					<p class="mt-2 text-sm text-slate-400">출시된 사이트들과 템플릿을 확인하세요</p>
				</div>
				<span
					class="mt-2 rounded-full bg-slate-700 px-4 py-1.5 text-sm text-slate-300 transition group-hover:bg-blue-600 group-hover:text-white"
				>
					보러 가기 →
				</span>
			</a>

			<!-- 새 사이트 만들기 -->
			<button
				type="button"
				onclick={startCreate}
				class="group flex cursor-pointer flex-col items-center gap-4 rounded-2xl bg-slate-800/50 p-8 transition hover:bg-slate-700/50"
			>
				<div
					class="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600/20 text-emerald-400 transition group-hover:bg-emerald-600/30"
				>
					<svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						/>
					</svg>
				</div>
				<div class="text-center">
					<h2 class="text-xl font-semibold text-white">새 사이트 만들기</h2>
					<p class="mt-2 text-sm text-slate-400">템플릿을 선택하고 사이트를 생성하세요</p>
				</div>
				<span
					class="mt-2 rounded-full bg-slate-700 px-4 py-1.5 text-sm text-slate-300 transition group-hover:bg-emerald-600 group-hover:text-white"
				>
					시작하기 →
				</span>
			</button>
		</div>

		<!-- 템플릿 선택 섹션 -->
		{#if showTemplates}
			<div id="templates" class="space-y-4">
				<StepIndicator current={1} />

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
							<div
								class="text-slate-500 transition group-hover:translate-x-1 group-hover:text-white"
							>
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
		{/if}
	</div>
</main>
