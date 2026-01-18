<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';
	import type { DeployedSite } from './+page.server';

	const { data }: { data: PageData } = $props();

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('ko-KR', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	const templateNames: Record<string, string> = {
		'template-00': 'Starlight',
		'template-01': 'VitePress',
		'template-02': 'Docusaurus'
	};

	const templates = [
		{ id: 'template-00', name: 'Starlight', subdomain: 'replica-template-00' },
		{ id: 'template-01', name: 'VitePress', subdomain: 'replica-template-01' },
		{ id: 'template-02', name: 'Docusaurus', subdomain: 'replica-template-02' }
	];
</script>

{#snippet siteCard(site: DeployedSite)}
	<a
		href={site.url}
		target="_blank"
		rel="external"
		class="rounded-xl bg-slate-800/50 p-4 transition hover:bg-slate-700/50"
	>
		<div class="flex items-center justify-between gap-2">
			<span class="truncate font-medium text-white">{site.subdomain}</span>
			<span class="shrink-0 rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
				{templateNames[site.template] || site.template}
			</span>
		</div>
		<div class="mt-1 text-xs text-slate-500">{formatDate(site.createdAt)}</div>
	</a>
{/snippet}

<svelte:head>
	<title>배포된 사이트 목록 | Replica Builder</title>
</svelte:head>

<main class="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 px-4 py-12">
	<div class="mx-auto max-w-4xl">
		<div class="mb-8 flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold text-white">사이트 목록</h1>
				<p class="mt-1 text-slate-400">템플릿과 배포된 사이트를 확인하세요</p>
			</div>
			<a
				href={resolve('/new')}
				class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
			>
				+ 새 사이트 만들기
			</a>
		</div>

		<!-- 템플릿 섹션 -->
		<section class="mb-12">
			<h2 class="mb-4 text-xl font-semibold text-white">템플릿</h2>
			<div class="grid gap-4 sm:grid-cols-3">
				{#each templates as template (template.id)}
					<a
						href="https://{template.subdomain}.xiyo.dev"
						target="_blank"
						rel="external"
						class="group rounded-xl bg-slate-800/50 p-4 text-center transition hover:bg-slate-800/70"
					>
						<span class="font-medium text-white">{template.name}</span>
					</a>
				{/each}
			</div>
		</section>

		<!-- 배포된 사이트 섹션 -->
		<section>
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-semibold text-white">배포된 사이트</h2>
				{#await data.sites}
					<span class="text-sm text-slate-400">불러오는 중...</span>
				{:then sites}
					<span class="text-sm text-slate-400">{sites.length}개</span>
				{/await}
			</div>

			{#await data.sites}
				<!-- Pending 상태: 스켈레톤 UI -->
				<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{#each Array(6) as _, i (i)}
						<div class="animate-pulse rounded-xl bg-slate-800/50 p-4">
							<div class="flex items-center justify-between gap-2">
								<div class="h-5 w-32 rounded bg-slate-700"></div>
								<div class="h-5 w-16 rounded bg-slate-700"></div>
							</div>
							<div class="mt-2 h-3 w-24 rounded bg-slate-700"></div>
						</div>
					{/each}
				</div>
			{:then sites}
				<!-- 성공 상태 -->
				{#if sites.length === 0}
					<div class="rounded-xl bg-slate-800/50 p-12 text-center">
						<p class="text-slate-400">배포된 사이트가 없습니다.</p>
						<a
							href={resolve('/new')}
							class="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
						>
							첫 사이트 만들기
						</a>
					</div>
				{:else}
					<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{#each sites as site (site.repoName)}
							{@render siteCard(site)}
						{/each}
					</div>
				{/if}
			{:catch error}
				<!-- 에러 상태 -->
				<div class="rounded-xl bg-red-900/30 p-6 text-center">
					<p class="text-red-400">사이트 목록을 불러오는데 실패했습니다.</p>
					<p class="mt-1 text-sm text-red-300">{error.message}</p>
					<button
						onclick={() => window.location.reload()}
						class="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500"
					>
						다시 시도
					</button>
				</div>
			{/await}
		</section>
	</div>
</main>
