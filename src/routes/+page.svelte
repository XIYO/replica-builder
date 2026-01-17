<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let submitting = $state(false);

	const siteTypes = [
		{ value: 'tech-docs', label: 'Technical Documentation' },
		{ value: 'product-docs', label: 'Product Documentation' },
		{ value: 'api-reference', label: 'API Reference' },
		{ value: 'learning', label: 'Learning / Tutorial' },
		{ value: 'personal', label: 'Personal / Blog' }
	];
</script>

<svelte:head>
	<title>Replica Builder</title>
	<meta name="description" content="Create your Starlight documentation site instantly" />
</svelte:head>

<main class="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 px-4 py-12">
	<div class="mx-auto max-w-2xl">
		<h1 class="mb-4 text-center text-4xl font-bold text-white">Replica Builder</h1>

		<p class="mb-8 text-center text-slate-300">
			Create your Starlight documentation site in seconds
		</p>

		{#if form?.success}
			<div class="mb-6 rounded-lg bg-green-900/50 p-6 text-green-200">
				<p class="text-lg font-semibold">배포가 시작되었습니다!</p>
				<div class="mt-4 space-y-2 text-sm">
					<p>
						사이트 URL:
						<a
							href={form.deployUrl}
							target="_blank"
							rel="external"
							class="underline hover:text-green-100"
						>
							{form.deployUrl}
						</a>
					</p>
				</div>
				<p class="mt-4 text-xs text-green-300">배포 완료까지 약 2-3분 소요됩니다.</p>
			</div>
		{/if}

		{#if form?.error === 'api'}
			<div class="mb-6 rounded-lg bg-red-900/50 p-4 text-red-200">
				<p class="font-semibold">GitHub API 오류</p>
				<p class="mt-1 text-sm">{form.message}</p>
			</div>
		{/if}

		<form
			method="POST"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
			class="space-y-6 rounded-xl bg-slate-800/50 p-8 shadow-xl"
		>
			<!-- Title -->
			<div>
				<label for="title" class="block text-sm font-medium text-slate-200"> 사이트 제목 </label>
				<input
					type="text"
					id="title"
					name="title"
					value={form?.title ?? ''}
					required
					placeholder="My Documentation"
					class="mt-1 block w-full rounded-md border-0 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
				/>
				{#if form?.error === 'title'}
					<p class="mt-1 text-sm text-red-400">{form.message}</p>
				{/if}
			</div>

			<!-- Topic -->
			<div>
				<label for="topic" class="block text-sm font-medium text-slate-200"> 문서 주제 </label>
				<input
					type="text"
					id="topic"
					name="topic"
					value={form?.topic ?? ''}
					required
					placeholder="React 학습 가이드, Docker 입문, API 레퍼런스 등"
					class="mt-1 block w-full rounded-md border-0 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
				/>
				<p class="mt-1 text-xs text-slate-400">AI가 이 주제로 초기 문서를 생성합니다</p>
				{#if form?.error === 'topic'}
					<p class="mt-1 text-sm text-red-400">{form.message}</p>
				{/if}
			</div>

			<!-- Subdomain (optional) -->
			<div>
				<label for="subdomain" class="block text-sm font-medium text-slate-200">
					서브도메인 <span class="text-slate-400">(선택)</span>
				</label>
				<div class="mt-1 flex rounded-md">
					<input
						type="text"
						id="subdomain"
						name="subdomain"
						placeholder="my-docs"
						pattern="[a-z0-9-]+"
						class="block w-full rounded-l-md border-0 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
					/>
					<span
						class="inline-flex items-center rounded-r-md bg-slate-600 px-3 text-sm text-slate-300"
					>
						.xiyo.dev
					</span>
				</div>
				<p class="mt-1 text-xs text-slate-400">비워두면 자동 생성됩니다</p>
			</div>

			<!-- Site Type -->
			<div>
				<label for="siteType" class="block text-sm font-medium text-slate-200"> 사이트 종류 </label>
				<select
					id="siteType"
					name="siteType"
					required
					class="mt-1 block w-full rounded-md border-0 bg-slate-700 px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
				>
					{#each siteTypes as { value, label } (value)}
						<option {value} selected={form?.siteType === value}>{label}</option>
					{/each}
				</select>
				{#if form?.error === 'siteType'}
					<p class="mt-1 text-sm text-red-400">{form.message}</p>
				{/if}
			</div>

			<!-- Accent Color -->
			<div>
				<label for="accentColor" class="block text-sm font-medium text-slate-200">
					테마 색상
				</label>
				<input
					type="color"
					id="accentColor"
					name="accentColor"
					value="#3b82f6"
					class="mt-1 h-10 w-full cursor-pointer rounded-md border-0 bg-slate-700 p-1"
				/>
			</div>

			<!-- Submit Button -->
			<button
				type="submit"
				disabled={submitting}
				class="w-full cursor-pointer rounded-md bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if submitting}
					배포 중...
				{:else}
					사이트 생성하기
				{/if}
			</button>
		</form>
	</div>
</main>
