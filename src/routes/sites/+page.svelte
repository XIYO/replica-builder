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
		'template-02': 'Docusaurus',
		'template-03': 'Rspress'
	};

	const templates = [
		{
			id: 'template-00',
			name: 'Starlight',
			framework: 'Astro',
			description: 'Astro 기반의 문서 사이트 프레임워크',
			subdomain: 'replica-template-00',
			repoUrl: 'https://github.com/XIYO/replica-template-00'
		},
		{
			id: 'template-01',
			name: 'VitePress',
			framework: 'Vue',
			description: 'Vue 기반의 정적 사이트 생성기',
			subdomain: 'replica-template-01',
			repoUrl: 'https://github.com/XIYO/replica-template-01'
		},
		{
			id: 'template-02',
			name: 'Docusaurus',
			framework: 'React',
			description: 'React 기반의 문서 사이트 프레임워크',
			subdomain: 'replica-template-02',
			repoUrl: 'https://github.com/XIYO/replica-template-02'
		},
		{
			id: 'template-03',
			name: 'Rspress',
			framework: 'React',
			description: 'Rust 기반 빌드 도구를 사용하는 빠른 문서 사이트',
			subdomain: 'replica-template-03',
			repoUrl: 'https://github.com/XIYO/replica-template-03'
		}
	];
</script>

{#snippet siteCard(site: DeployedSite)}
	<div
		class="group flex items-start gap-4 rounded-xl bg-slate-800/50 p-5 transition hover:bg-slate-800/70"
	>
		<!-- 썸네일 이미지 -->
		<a href={site.url} target="_blank" rel="external" class="shrink-0">
			<img
				src="https://screenshots.xiyo.dev/{site.subdomain}.png"
				alt="{site.subdomain} 미리보기"
				class="h-20 w-32 rounded-lg border border-slate-700 bg-slate-900 object-cover transition group-hover:border-slate-600"
				loading="lazy"
				onerror={(e) => {
					const img = e.currentTarget as HTMLImageElement;
					img.style.display = 'none';
					const fallback = img.nextElementSibling as HTMLElement;
					if (fallback) fallback.style.display = 'flex';
				}}
			/>
			<div
				class="hidden h-20 w-32 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-xs text-slate-500"
			>
				미리보기 없음
			</div>
		</a>

		<div class="flex flex-1 flex-col justify-between">
			<div>
				<div class="flex items-center gap-3">
					<a
						href={site.url}
						target="_blank"
						rel="external"
						class="text-lg font-medium text-white hover:text-blue-400"
					>
						{site.subdomain}<span class="text-slate-500">.xiyo.dev</span>
					</a>
					<span class="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
						{templateNames[site.template] || site.template}
					</span>
				</div>
				<div class="mt-1 flex items-center gap-3 text-sm text-slate-500">
					<span>{formatDate(site.createdAt)}</span>
					<a href={site.repoUrl} target="_blank" rel="external" class="hover:text-slate-300">
						{site.repoName}
					</a>
				</div>
			</div>

			<div class="mt-2 flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
				<a
					href={site.url}
					target="_blank"
					rel="external"
					class="rounded-md bg-slate-700 px-3 py-1.5 text-sm text-white transition hover:bg-slate-600"
				>
					방문
				</a>
				<a
					href={site.repoUrl}
					target="_blank"
					rel="external"
					class="rounded-md bg-slate-700 px-3 py-1.5 text-sm text-white transition hover:bg-slate-600"
				>
					GitHub
				</a>
			</div>
		</div>
	</div>
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
				href={resolve('/')}
				class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
			>
				+ 새 사이트 만들기
			</a>
		</div>

		<!-- 템플릿 섹션 -->
		<section class="mb-12">
			<h2 class="mb-4 text-xl font-semibold text-white">템플릿</h2>
			<div class="grid gap-4 sm:grid-cols-2">
				{#each templates as template (template.id)}
					<div
						class="group relative overflow-hidden rounded-xl bg-slate-800/50 transition hover:bg-slate-800/70"
					>
						<a
							href="https://{template.subdomain}.xiyo.dev"
							target="_blank"
							rel="external"
							class="block"
						>
							<img
								src="https://screenshots.xiyo.dev/{template.subdomain}.png"
								alt="{template.name} 미리보기"
								class="h-40 w-full object-cover object-top transition group-hover:scale-105"
								loading="lazy"
							/>
						</a>
						<div class="p-4">
							<div class="flex items-center gap-2">
								<h3 class="font-medium text-white">{template.name}</h3>
								<span class="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
									{template.framework}
								</span>
							</div>
							<p class="mt-1 text-sm text-slate-400">{template.description}</p>
							<div class="mt-3 flex gap-2">
								<a
									href="https://{template.subdomain}.xiyo.dev"
									target="_blank"
									rel="external"
									class="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white transition hover:bg-blue-500"
								>
									데모 보기
								</a>
								<a
									href={template.repoUrl}
									target="_blank"
									rel="external"
									class="rounded-md bg-slate-700 px-3 py-1.5 text-sm text-white transition hover:bg-slate-600"
								>
									GitHub
								</a>
								<a
									href={resolve(`/configure/${template.id}`)}
									class="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white transition hover:bg-emerald-500"
								>
									이 템플릿 사용
								</a>
							</div>
						</div>
					</div>
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
			<div class="grid gap-4">
				{#each Array(5) as _, i (i)}
					<div class="flex animate-pulse items-start gap-4 rounded-xl bg-slate-800/50 p-5">
						<div class="h-20 w-32 shrink-0 rounded-lg bg-slate-700"></div>
						<div class="flex-1">
							<div class="flex items-center gap-3">
								<div class="h-6 w-40 rounded bg-slate-700"></div>
								<div class="h-5 w-16 rounded bg-slate-700"></div>
							</div>
							<div class="mt-2 flex gap-3">
								<div class="h-4 w-32 rounded bg-slate-700"></div>
								<div class="h-4 w-48 rounded bg-slate-700"></div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:then sites}
			<!-- 성공 상태 -->
			{#if sites.length === 0}
				<div class="rounded-xl bg-slate-800/50 p-12 text-center">
					<p class="text-slate-400">배포된 사이트가 없습니다.</p>
					<a
						href={resolve('/')}
						class="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
					>
						첫 사이트 만들기
					</a>
				</div>
			{:else}
				<div class="grid gap-4">
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
