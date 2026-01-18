<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import StepIndicator from '$lib/components/StepIndicator.svelte';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	// 표시할 필드 목록 (순서대로)
	const visibleFields = ['title', 'topic', 'accentColor'];

	// 필터링된 필드
	const filteredFields = $derived(
		visibleFields
			.map((name) => data.fields.find((f) => f.name === name))
			.filter((f) => f !== undefined)
	);

	// 폼 데이터 초기화 (기본값 적용)
	let formData = $state<Record<string, string | boolean>>({});

	$effect(() => {
		const initial: Record<string, string | boolean> = {};
		for (const field of data.fields) {
			if (field.default !== undefined) {
				initial[field.name] = field.default;
			}
		}
		// 언어는 항상 한국어로 고정
		initial['locale'] = 'ko';
		formData = initial;
	});

	// subdomain 자동 생성 (타임스탬프 기반)
	function generateSubdomain(): string {
		const timestamp = Date.now().toString(36);
		const random = Math.random().toString(36).substring(2, 6);
		return `site-${timestamp}-${random}`;
	}

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
		// subdomain 자동 생성
		const finalFormData = {
			...formData,
			subdomain: generateSubdomain()
		};

		// sessionStorage에 폼 데이터 저장
		sessionStorage.setItem(
			'configFormData',
			JSON.stringify({
				template: data.template.id,
				fields: data.fields,
				values: finalFormData
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
				<a href={resolve('/new')} class="text-sm text-slate-400 hover:text-white">← 템플릿 변경</a>
			</div>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleSubmit();
				}}
				class="space-y-5"
			>
				{#each filteredFields as field (field.name)}
					{#if field && !['array', 'image'].includes(field.type)}
						<div>
							<label for={field.name} class="block text-sm font-medium text-slate-200">
								{field.label}
							</label>

							{#if field.description}
								<p class="mt-0.5 text-xs text-slate-500">{field.description}</p>
							{/if}

							{#if field.type === 'text'}
								<input
									type="text"
									id={field.name}
									bind:value={formData[field.name]}
									required={field.required}
									placeholder={field.placeholder}
									class="mt-1 block w-full rounded-md border-0 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
								/>
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
					class="mt-6 w-full cursor-pointer rounded-md bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500"
				>
					다음 단계로
				</button>
			</form>
		</div>
	</div>
</main>
