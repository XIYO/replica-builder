<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Replica Builder</title>
	<meta name="description" content="AI 기반 문서 사이트 생성 플랫폼" />
</svelte:head>

<main class="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
	<!-- 히어로 섹션 -->
	<section class="flex min-h-screen flex-col items-center justify-center px-4 text-center">
		<div class="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-2 text-sm text-blue-400">
			<span class="relative flex h-2 w-2">
				<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
				<span class="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
			</span>
			AI 기반 문서 자동 생성
		</div>

		<h1 class="mb-6 text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
			Replica Builder
		</h1>

		<p class="mb-8 max-w-2xl text-lg text-slate-400 sm:text-xl">
			주제만 입력하면 AI가 전문적인 문서 사이트를 자동으로 생성합니다.
			<br class="hidden sm:block" />
			Starlight, VitePress, Docusaurus 템플릿을 지원합니다.
		</p>

		<!-- 히어로 버튼 -->
		<div class="flex flex-col gap-4 sm:flex-row">
			<a
				href={resolve('/new')}
				class="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white transition hover:bg-blue-500"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				새 사이트 만들기
			</a>
			<a
				href={resolve('/sites')}
				class="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800/50 px-8 py-4 text-lg font-semibold text-white transition hover:border-slate-500 hover:bg-slate-700/50"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
				</svg>
				사이트 목록
			</a>
		</div>

		<!-- 스크롤 힌트 -->
		<div class="absolute bottom-8 animate-bounce text-slate-500">
			<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
			</svg>
		</div>
	</section>

	<!-- 특징 섹션 -->
	<section class="px-4 py-24">
		<div class="mx-auto max-w-5xl">
			<h2 class="mb-12 text-center text-3xl font-bold text-white">주요 기능</h2>
			<div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
				<div class="rounded-xl bg-slate-800/50 p-6">
					<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
						<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
						</svg>
					</div>
					<h3 class="mb-2 text-lg font-semibold text-white">AI 콘텐츠 생성</h3>
					<p class="text-sm text-slate-400">주제만 입력하면 Gemini AI가 전문적인 문서 콘텐츠를 자동 생성합니다.</p>
				</div>

				<div class="rounded-xl bg-slate-800/50 p-6">
					<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
						<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
						</svg>
					</div>
					<h3 class="mb-2 text-lg font-semibold text-white">다양한 템플릿</h3>
					<p class="text-sm text-slate-400">Starlight, VitePress, Docusaurus 중 원하는 프레임워크를 선택하세요.</p>
				</div>

				<div class="rounded-xl bg-slate-800/50 p-6">
					<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
						<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
						</svg>
					</div>
					<h3 class="mb-2 text-lg font-semibold text-white">즉시 배포</h3>
					<p class="text-sm text-slate-400">Cloudflare Workers로 자동 배포되어 몇 분 내에 사이트가 라이브됩니다.</p>
				</div>
			</div>
		</div>
	</section>

	<!-- CTA 섹션 -->
	<section class="px-4 py-24">
		<div class="mx-auto max-w-3xl rounded-2xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-12 text-center">
			<h2 class="mb-4 text-2xl font-bold text-white sm:text-3xl">지금 바로 시작하세요</h2>
			<p class="mb-8 text-slate-300">몇 번의 클릭만으로 전문적인 문서 사이트를 만들 수 있습니다.</p>
			<a
				href={resolve('/new')}
				class="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-4 text-lg font-semibold text-slate-900 transition hover:bg-slate-100"
			>
				시작하기
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
				</svg>
			</a>
		</div>
	</section>
</main>
