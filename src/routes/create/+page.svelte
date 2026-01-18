<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import StepIndicator from '$lib/components/StepIndicator.svelte';
	import { getTemplateById } from '$lib/data/templates';
	import type { ConfigFormData, SchemaField } from '$lib/data/types';
	import type { ActionData } from './$types';

	const { form }: { form: ActionData } = $props();

	let configData = $state<ConfigFormData | null>(null);
	let template = $state<ReturnType<typeof getTemplateById>>(undefined);
	let submitting = $state(false);

	onMount(() => {
		const stored = sessionStorage.getItem('configFormData');
		if (!stored) {
			goto(resolve('/'));
			return;
		}

		configData = JSON.parse(stored);
		if (configData) {
			template = getTemplateById(configData.template);
		}
	});

	function getFieldLabel(fieldName: string): string {
		const field = configData?.fields.find((f: SchemaField) => f.name === fieldName);
		return field?.label || fieldName;
	}

	function getField(fieldName: string): SchemaField | undefined {
		return configData?.fields.find((f: SchemaField) => f.name === fieldName);
	}
</script>

<svelte:head>
	<title>사이트 생성 | Replica Builder</title>
</svelte:head>

<main class="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 px-4 py-12">
	<div class="mx-auto max-w-3xl">
		<h1 class="mb-4 text-center text-4xl font-bold text-white">Replica Builder</h1>
		<p class="mb-8 text-center text-slate-300">Create your documentation site in seconds</p>

		<StepIndicator current={3} />

		<!-- 성공 메시지 -->
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
				<a
					href={resolve('/')}
					class="mt-4 inline-block rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500"
				>
					새 사이트 만들기
				</a>
			</div>
		{/if}

		<!-- 에러 메시지 -->
		{#if form?.error === 'api'}
			<div class="mb-6 rounded-lg bg-red-900/50 p-4 text-red-200">
				<p class="font-semibold">GitHub API 오류</p>
				<p class="mt-1 text-sm">{form.message}</p>
			</div>
		{/if}

		{#if configData && template && !form?.success}
			<form
				method="POST"
				use:enhance={() => {
					submitting = true;
					return async ({ result, update }) => {
						await update();
						submitting = false;
						sessionStorage.removeItem('configFormData');

						// 성공 시 status 페이지로 리다이렉트
						if (result.type === 'success' && result.data?.subdomain) {
							goto(resolve(`/status/${result.data.subdomain}`));
						}
					};
				}}
				class="space-y-6 rounded-xl bg-slate-800/50 p-8 shadow-xl"
			>
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-xl font-semibold text-white">사이트 생성</h2>
						<p class="mt-1 text-sm text-slate-400">
							{template.name}
							<span class="rounded bg-slate-600 px-1.5 py-0.5 text-xs">{template.framework}</span>
						</p>
					</div>
					<a
						href={resolve(`/configure/${configData.template}`)}
						class="text-sm text-slate-400 hover:text-white"
					>
						← 설정 수정
					</a>
				</div>

				<!-- 설정 요약 -->
				<div class="space-y-3 rounded-lg bg-slate-900/50 p-4">
					<h3 class="text-sm font-medium text-slate-300">설정 요약</h3>
					<dl class="space-y-2 text-sm">
						{#each Object.entries(configData.values).filter(([, v]) => v !== '' && v !== undefined) as [key, value] (key)}
							{@const field = getField(key)}
							<div class="flex justify-between">
								<dt class="text-slate-400">{getFieldLabel(key)}</dt>
								<dd class="text-white">
									{#if field?.type === 'color'}
										<span class="inline-block h-4 w-4 rounded" style="background-color: {value}"
										></span>
									{:else if field?.type === 'boolean'}
										{value ? '예' : '아니오'}
									{:else if field?.type === 'select'}
										{field?.options?.find((o) => o.value === value)?.label || value}
									{:else if typeof value === 'string' && value.length > 30}
										{value.slice(0, 30)}...
									{:else}
										{value}
									{/if}
								</dd>
							</div>
						{/each}
					</dl>
				</div>

				<!-- hidden inputs -->
				<input type="hidden" name="template" value={configData.template} />
				{#each Object.entries(configData.values) as [key, value] (key)}
					<input type="hidden" name={key} value={String(value)} />
				{/each}

				<button
					type="submit"
					disabled={submitting}
					class="w-full cursor-pointer rounded-md bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if submitting}
						배포 중...
					{:else}
						사이트 생성하기
					{/if}
				</button>
			</form>
		{:else if !form?.success}
			<div class="rounded-xl bg-slate-800/50 p-8 text-center">
				<p class="text-slate-400">설정 데이터가 없습니다. 처음부터 시작해주세요.</p>
				<a
					href={resolve('/')}
					class="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
				>
					템플릿 선택으로
				</a>
			</div>
		{/if}
	</div>
</main>
