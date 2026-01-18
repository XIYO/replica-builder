<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';
	import type { WorkflowStatusResponse } from '../../api/workflow-status/[subdomain]/+server';
	import type { WorkflowJob, WorkflowRun } from '$lib/github';

	const { data }: { data: PageData } = $props();

	let status = $state<'searching' | 'progress' | 'completed' | 'error'>('searching');
	let message = $state('워크플로우를 검색하고 있습니다...');
	let run = $state<WorkflowRun | null>(null);
	let jobs = $state<WorkflowJob[]>([]);
	let deployUrl = $state<string | null>(null);
	let intervalId: ReturnType<typeof setInterval> | null = null;

	async function fetchStatus() {
		try {
			const response = await fetch(resolve(`/api/workflow-status/${data.subdomain}`));
			if (!response.ok) throw new Error('API 오류');

			const result = (await response.json()) as WorkflowStatusResponse;

			status = result.status;
			if (result.message) message = result.message;
			if (result.run) run = result.run;
			if (result.jobs) jobs = result.jobs;
			if (result.deployUrl) deployUrl = result.deployUrl;

			// 완료되면 폴링 중지
			if (status === 'completed' || status === 'error') {
				if (intervalId) {
					clearInterval(intervalId);
					intervalId = null;
				}
			}
		} catch {
			status = 'error';
			message = '상태를 가져올 수 없습니다.';
			if (intervalId) {
				clearInterval(intervalId);
				intervalId = null;
			}
		}
	}

	onMount(() => {
		// 즉시 한 번 실행
		fetchStatus();
		// 10초마다 폴링
		intervalId = setInterval(fetchStatus, 10000);
	});

	onDestroy(() => {
		if (intervalId) clearInterval(intervalId);
	});

	function getStepIcon(stepStatus: string, conclusion: string | null) {
		if (stepStatus === 'completed') {
			if (conclusion === 'success') return '✓';
			if (conclusion === 'failure') return '✗';
			if (conclusion === 'skipped') return '○';
			return '•';
		}
		if (stepStatus === 'in_progress') return '◐';
		return '○';
	}

	function getStepColor(stepStatus: string, conclusion: string | null) {
		if (stepStatus === 'completed') {
			if (conclusion === 'success') return 'text-green-400';
			if (conclusion === 'failure') return 'text-red-400';
			return 'text-slate-500';
		}
		if (stepStatus === 'in_progress') return 'text-yellow-400';
		return 'text-slate-600';
	}

	// skipped 단계 제외
	const visibleSteps = $derived(
		jobs[0]?.steps.filter((s) => s.conclusion !== 'skipped') || []
	);
	const completedSteps = $derived(visibleSteps.filter((s) => s.status === 'completed').length);
	const totalSteps = $derived(visibleSteps.length);
	const progressPercent = $derived(
		totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
	);
</script>

<svelte:head>
	<title>배포 상태 - {data.subdomain}.xiyo.dev | Replica Builder</title>
</svelte:head>

<main class="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 px-4 py-12">
	<div class="mx-auto max-w-2xl">
		<h1 class="mb-2 text-center text-3xl font-bold text-white">배포 진행 상황</h1>
		<p class="mb-8 text-center text-slate-400">
			<span class="font-mono text-blue-400">{data.subdomain}.xiyo.dev</span>
		</p>

		<div class="rounded-xl bg-slate-800/50 p-6 shadow-xl">
			<!-- 상태 헤더 -->
			<div class="mb-6 flex items-center gap-3">
				{#if status === 'searching'}
					<div
						class="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"
					></div>
					<span class="text-slate-300">{message}</span>
				{:else if status === 'progress'}
					<div
						class="h-5 w-5 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent"
					></div>
					<span class="text-slate-300">배포 진행 중...</span>
				{:else if status === 'completed' && run?.conclusion === 'success'}
					<span class="text-2xl">🎉</span>
					<span class="font-semibold text-green-400">{message}</span>
				{:else if status === 'completed'}
					<span class="text-2xl">❌</span>
					<span class="font-semibold text-red-400">{message}</span>
				{:else if status === 'error'}
					<span class="text-2xl">⚠️</span>
					<span class="text-red-400">{message}</span>
				{/if}
			</div>

			<!-- 프로그레스 바 -->
			{#if status === 'progress' || status === 'completed'}
				<div class="mb-6">
					<div class="mb-2 flex justify-between text-sm">
						<span class="text-slate-400">진행률</span>
						<span class="text-slate-300">{progressPercent}%</span>
					</div>
					<div class="h-3 overflow-hidden rounded-full bg-slate-700">
						<div
							class="h-full transition-all duration-500 {run?.conclusion === 'success'
								? 'bg-green-500'
								: run?.conclusion === 'failure'
									? 'bg-red-500'
									: 'bg-blue-500'}"
							style="width: {progressPercent}%"
						></div>
					</div>
				</div>
			{/if}

			<!-- 단계 목록 -->
			{#if visibleSteps.length > 0}
				<div class="space-y-2">
					<h3 class="mb-3 text-sm font-medium text-slate-400">빌드 단계</h3>
					{#each visibleSteps as step (step.number)}
						<div
							class="flex items-center gap-3 rounded-lg px-3 py-2 {step.status === 'in_progress'
								? 'bg-slate-700/50'
								: ''}"
						>
							<span class="text-lg {getStepColor(step.status, step.conclusion)}">
								{getStepIcon(step.status, step.conclusion)}
							</span>
							<span
								class="flex-1 text-sm {step.status === 'completed'
									? 'text-slate-400'
									: step.status === 'in_progress'
										? 'text-white'
										: 'text-slate-500'}"
							>
								{step.name}
							</span>
							{#if step.status === 'in_progress'}
								<span class="text-xs text-yellow-400">실행 중</span>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

			<!-- 완료 시 액션 버튼들 -->
			{#if status === 'completed'}
				<div class="mt-6 flex flex-col gap-3 border-t border-slate-700 pt-6">
					{#if deployUrl}
						<a
							href={deployUrl}
							target="_blank"
							rel="external"
							class="block w-full rounded-md bg-green-600 px-4 py-3 text-center font-semibold text-white transition hover:bg-green-500"
						>
							사이트 방문하기 →
						</a>
					{/if}
					{#if run?.html_url}
						<a
							href={run.html_url}
							target="_blank"
							rel="external"
							class="block w-full rounded-md bg-slate-600 px-4 py-2 text-center text-sm text-white transition hover:bg-slate-500"
						>
							GitHub Actions 로그 보기
						</a>
					{/if}
					<a
						href={resolve('/')}
						class="block w-full rounded-md border border-slate-600 px-4 py-2 text-center text-sm text-slate-300 transition hover:bg-slate-700"
					>
						새 사이트 만들기
					</a>
				</div>
			{/if}

			<!-- 에러 시 재시도 -->
			{#if status === 'error'}
				<div class="mt-6 flex gap-3 border-t border-slate-700 pt-6">
					<button
						onclick={() => window.location.reload()}
						class="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-500"
					>
						다시 시도
					</button>
					<a
						href={resolve('/')}
						class="flex-1 rounded-md border border-slate-600 px-4 py-2 text-center text-slate-300 transition hover:bg-slate-700"
					>
						처음으로
					</a>
				</div>
			{/if}
		</div>

		<!-- 워크플로우 정보 -->
		{#if run}
			<div class="mt-4 text-center text-xs text-slate-500">
				Run #{run.id} • {new Date(run.created_at).toLocaleString('ko-KR')}
			</div>
		{/if}
	</div>
</main>
