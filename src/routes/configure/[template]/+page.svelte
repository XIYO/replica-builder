<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import StepIndicator from '$lib/components/StepIndicator.svelte';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	// 폼 데이터 초기화 (기본값 적용)
	let formData = $state<Record<string, string | boolean>>({});

	// subdomain 검증 상태
	let subdomainStatus = $state<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
	let subdomainError = $state<string>('');
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		const initial: Record<string, string | boolean> = {};
		for (const field of data.fields) {
			if (field.default !== undefined) {
				initial[field.name] = field.default;
			}
		}
		formData = initial;
	});

	async function checkSubdomain(subdomain: string) {
		if (!subdomain) {
			subdomainStatus = 'idle';
			subdomainError = '';
			return;
		}

		// 형식 검증 (소문자, 숫자, 하이픈만)
		if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)) {
			subdomainStatus = 'invalid';
			subdomainError = '소문자, 숫자, 하이픈만 사용 가능합니다.';
			return;
		}

		subdomainStatus = 'checking';
		subdomainError = '';

		try {
			const res = await fetch(resolve(`/api/check-subdomain/${subdomain}`));
			const result = (await res.json()) as {
				available?: boolean;
				error?: string;
				message?: string;
			};

			if (!res.ok) {
				subdomainStatus = 'invalid';
				subdomainError = result.message || '검증 중 오류 발생';
				return;
			}

			if (result.available) {
				subdomainStatus = 'available';
				subdomainError = '';
			} else {
				subdomainStatus = 'taken';
				subdomainError = result.error || '이미 사용 중인 주소입니다.';
			}
		} catch {
			subdomainStatus = 'invalid';
			subdomainError = '네트워크 오류';
		}
	}

	function handleSubdomainInput(value: string) {
		const subdomain = value.toLowerCase();
		formData['subdomain'] = subdomain;

		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => checkSubdomain(subdomain), 500);
	}

	const canSubmit = $derived(subdomainStatus !== 'taken' && subdomainStatus !== 'checking');

	// 샘플 토픽
	const sampleTopics = [
		{ label: '시니어 건강', topic: '60대 이상 시니어를 위한 디지털 헬스케어 가이드' },
		{ label: '개발자 웰니스', topic: '개발자 번아웃 예방과 건강한 코딩 라이프' },
		{ label: '스토아 철학', topic: '현대인을 위한 스토아 철학 실천 가이드' },
		{ label: 'AI 프롬프트', topic: 'ChatGPT와 LLM을 위한 프롬프트 엔지니어링' },
		{ label: 'MZ 재테크', topic: '2026 MZ세대 재테크 트렌드와 투자 전략' }
	];

	function selectTopic(topic: string) {
		formData['topic'] = topic;
	}

	function handleSubmit() {
		// sessionStorage에 폼 데이터 저장
		sessionStorage.setItem(
			'configFormData',
			JSON.stringify({
				template: data.template.id,
				fields: data.fields,
				values: formData
			})
		);
		goto(resolve('/create'));
	}
</script>

<svelte:head>
	<title>설정 - {data.template.name} | Replica Builder</title>
</svelte:head>

<main class="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 px-4 py-12">
	<div class="mx-auto max-w-3xl">
		<h1 class="mb-4 text-center text-4xl font-bold text-white">Replica Builder</h1>
		<p class="mb-8 text-center text-slate-300">Create your documentation site in seconds</p>

		<StepIndicator current={2} />

		<div class="space-y-6 rounded-xl bg-slate-800/50 p-8 shadow-xl">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-xl font-semibold text-white">사이트 설정</h2>
					<p class="mt-1 text-sm text-slate-400">
						{data.template.name}
						<span class="rounded bg-slate-600 px-1.5 py-0.5 text-xs">{data.template.framework}</span
						>
					</p>
				</div>
				<a href={resolve('/')} class="text-sm text-slate-400 hover:text-white">← 템플릿 변경</a>
			</div>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
				class="space-y-5"
			>
				{#each data.fields as field (field.name)}
					{#if !['array', 'image'].includes(field.type)}
						<div>
							<label for={field.name} class="block text-sm font-medium text-slate-200">
								{field.label}
								{#if !field.required}
									<span class="text-slate-500">(선택)</span>
								{/if}
							</label>

							{#if field.description}
								<p class="mt-0.5 text-xs text-slate-500">{field.description}</p>
							{/if}

							{#if field.type === 'text'}
								{#if field.name === 'subdomain'}
									<div class="mt-1 flex rounded-md">
										<input
											type="text"
											id={field.name}
											value={formData[field.name] || ''}
											oninput={(e) => handleSubdomainInput(e.currentTarget.value)}
											placeholder={field.placeholder}
											pattern={field.validation?.pattern}
											class="block w-full rounded-l-md border-0 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 {subdomainStatus ===
												'taken' || subdomainStatus === 'invalid'
												? 'ring-2 ring-red-500'
												: ''} {subdomainStatus === 'available' ? 'ring-2 ring-green-500' : ''}"
										/>
										<span
											class="inline-flex items-center rounded-r-md bg-slate-600 px-3 text-sm text-slate-300"
										>
											.xiyo.dev
										</span>
									</div>
									<!-- 검증 상태 표시 -->
									<div class="mt-1.5 flex items-center gap-1.5 text-xs">
										{#if subdomainStatus === 'checking'}
											<span class="text-slate-400">확인 중...</span>
										{:else if subdomainStatus === 'available'}
											<span class="text-green-400">✓ 사용 가능한 주소입니다.</span>
										{:else if subdomainStatus === 'taken'}
											<span class="text-red-400">✗ {subdomainError}</span>
										{:else if subdomainStatus === 'invalid'}
											<span class="text-red-400">✗ {subdomainError}</span>
										{/if}
									</div>
								{:else}
									<input
										type="text"
										id={field.name}
										bind:value={formData[field.name]}
										required={field.required}
										placeholder={field.placeholder}
										class="mt-1 block w-full rounded-md border-0 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
									/>
								{/if}
							{:else if field.type === 'textarea'}
								{#if field.name === 'topic'}
									<div class="mt-2 flex flex-wrap gap-2">
										{#each sampleTopics as { label, topic } (label)}
											<button
												type="button"
												onclick={() => selectTopic(topic)}
												class="rounded-full bg-slate-600 px-3 py-1 text-xs text-slate-200 transition hover:bg-slate-500"
											>
												{label}
											</button>
										{/each}
									</div>
								{/if}
								<textarea
									id={field.name}
									bind:value={formData[field.name]}
									required={field.required}
									placeholder={field.placeholder}
									rows="2"
									class="mt-2 block w-full resize-none rounded-md border-0 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
								></textarea>
							{:else if field.type === 'color'}
								<input
									type="color"
									id={field.name}
									bind:value={formData[field.name]}
									class="mt-1 h-10 w-full cursor-pointer rounded-md border-0 bg-slate-700 p-1"
								/>
							{:else if field.type === 'select'}
								<select
									id={field.name}
									bind:value={formData[field.name]}
									required={field.required}
									class="mt-1 block w-full rounded-md border-0 bg-slate-700 px-3 py-2 text-white focus:ring-2 focus:ring-blue-500"
								>
									{#each field.options || [] as option (option.value)}
										<option value={option.value}>{option.label}</option>
									{/each}
								</select>
							{:else if field.type === 'boolean'}
								<label class="mt-2 flex items-center gap-2">
									<input
										type="checkbox"
										id={field.name}
										bind:checked={formData[field.name]}
										class="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
									/>
									<span class="text-sm text-slate-300">활성화</span>
								</label>
							{/if}
						</div>
					{/if}
				{/each}

				<button
					type="submit"
					disabled={!canSubmit}
					class="mt-6 w-full cursor-pointer rounded-md bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if subdomainStatus === 'checking'}
						주소 확인 중...
					{:else}
						다음 단계로
					{/if}
				</button>
			</form>
		</div>
	</div>
</main>
