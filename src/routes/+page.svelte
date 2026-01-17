<script lang="ts">
	import { enhance } from '$app/forms';
	import yaml from 'js-yaml';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	// 스텝 관리
	let currentStep = $state(1);
	let submitting = $state(false);

	// 템플릿 목록 (확장 가능)
	const templates = [
		{
			id: 'replica-template-00',
			name: 'Starlight Docs',
			description: 'Starlight 기반 문서 사이트',
			preview: 'https://replica-template-00.xiyo.dev',
			schemaUrl:
				'https://raw.githubusercontent.com/XIYO/replica-template-00/main/config.schema.yaml'
		}
	];

	// 선택된 템플릿
	let selectedTemplate = $state<(typeof templates)[0] | null>(null);

	// 스키마에서 로드된 필드들
	interface SchemaField {
		name: string;
		type: string;
		label: string;
		description?: string;
		required?: boolean;
		default?: string | boolean;
		placeholder?: string;
		options?: { value: string; label: string }[];
		validation?: { pattern: string; message: string };
	}
	let schemaFields = $state<SchemaField[]>([]);
	let schemaLoading = $state(false);

	// 폼 데이터
	let formData = $state<Record<string, string | boolean>>({});

	// 샘플 토픽
	const sampleTopics = [
		{ label: '시니어 건강', topic: '60대 이상 시니어를 위한 디지털 헬스케어 가이드' },
		{ label: '개발자 웰니스', topic: '개발자 번아웃 예방과 건강한 코딩 라이프' },
		{ label: '스토아 철학', topic: '현대인을 위한 스토아 철학 실천 가이드' },
		{ label: 'AI 프롬프트', topic: 'ChatGPT와 LLM을 위한 프롬프트 엔지니어링' },
		{ label: 'MZ 재테크', topic: '2026 MZ세대 재테크 트렌드와 투자 전략' }
	];

	// 템플릿 선택
	async function selectTemplate(template: (typeof templates)[0]) {
		selectedTemplate = template;
		schemaLoading = true;

		try {
			const response = await fetch(template.schemaUrl);
			const yamlText = await response.text();
			const schema = yaml.load(yamlText) as { fields: SchemaField[] };
			schemaFields = schema.fields || [];

			// 기본값 설정
			for (const field of schemaFields) {
				if (field.default !== undefined) {
					formData[field.name] = field.default;
				}
			}
		} catch (e) {
			console.error('스키마 로드 실패:', e);
			schemaFields = [];
		} finally {
			schemaLoading = false;
		}

		currentStep = 2;
	}

	// 이전 스텝
	function prevStep() {
		if (currentStep > 1) currentStep--;
	}

	// 다음 스텝
	function nextStep() {
		if (currentStep < 3) currentStep++;
	}

	// 토픽 선택
	function selectTopic(topic: string) {
		formData['topic'] = topic;
	}
</script>

<svelte:head>
	<title>Replica Builder</title>
	<meta name="description" content="Create your Starlight documentation site instantly" />
</svelte:head>

<main class="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 px-4 py-12">
	<div class="mx-auto max-w-3xl">
		<h1 class="mb-4 text-center text-4xl font-bold text-white">Replica Builder</h1>
		<p class="mb-8 text-center text-slate-300">
			Create your Starlight documentation site in seconds
		</p>

		<!-- 스텝 인디케이터 -->
		<div class="mb-8 flex items-center justify-center gap-4">
			{#each [1, 2, 3] as step (step)}
				<div class="flex items-center gap-2">
					<div
						class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors
						{currentStep >= step ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}"
					>
						{step}
					</div>
					<span class="text-sm {currentStep >= step ? 'text-white' : 'text-slate-500'}">
						{#if step === 1}템플릿{:else if step === 2}설정{:else}생성{/if}
					</span>
				</div>
				{#if step < 3}
					<div class="h-px w-8 {currentStep > step ? 'bg-blue-600' : 'bg-slate-700'}"></div>
				{/if}
			{/each}
		</div>

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
			</div>
		{/if}

		<!-- 에러 메시지 -->
		{#if form?.error === 'api'}
			<div class="mb-6 rounded-lg bg-red-900/50 p-4 text-red-200">
				<p class="font-semibold">GitHub API 오류</p>
				<p class="mt-1 text-sm">{form.message}</p>
			</div>
		{/if}

		<!-- Step 1: 템플릿 선택 -->
		{#if currentStep === 1}
			<div class="space-y-4">
				<h2 class="text-xl font-semibold text-white">템플릿 선택</h2>
				<div class="grid gap-4">
					{#each templates as template (template.id)}
						<button
							type="button"
							onclick={() => selectTemplate(template)}
							class="group flex items-center gap-4 rounded-xl bg-slate-800/50 p-6 text-left transition hover:bg-slate-700/50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
						>
							<div class="flex-1">
								<h3 class="text-lg font-semibold text-white">{template.name}</h3>
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

		<!-- Step 2: 설정 입력 -->
		{#if currentStep === 2}
			<div class="space-y-6 rounded-xl bg-slate-800/50 p-8 shadow-xl">
				<div class="flex items-center justify-between">
					<h2 class="text-xl font-semibold text-white">사이트 설정</h2>
					<button type="button" onclick={prevStep} class="text-sm text-slate-400 hover:text-white">
						← 템플릿 변경
					</button>
				</div>

				{#if schemaLoading}
					<div class="py-8 text-center text-slate-400">스키마 로딩 중...</div>
				{:else}
					<div class="space-y-5">
						{#each schemaFields as field (field.name)}
							<!-- 기본 필드만 표시 (array, image 제외) -->
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
													bind:value={formData[field.name]}
													placeholder={field.placeholder}
													pattern={field.validation?.pattern}
													class="block w-full rounded-l-md border-0 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
												/>
												<span
													class="inline-flex items-center rounded-r-md bg-slate-600 px-3 text-sm text-slate-300"
												>
													.xiyo.dev
												</span>
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
											<!-- 토픽 필드에 샘플 칩 추가 -->
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
					</div>

					<button
						type="button"
						onclick={nextStep}
						class="mt-6 w-full cursor-pointer rounded-md bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500"
					>
						다음 단계로
					</button>
				{/if}
			</div>
		{/if}

		<!-- Step 3: 생성 -->
		{#if currentStep === 3}
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
				<div class="flex items-center justify-between">
					<h2 class="text-xl font-semibold text-white">사이트 생성</h2>
					<button type="button" onclick={prevStep} class="text-sm text-slate-400 hover:text-white">
						← 설정 수정
					</button>
				</div>

				<!-- 설정 요약 -->
				<div class="space-y-3 rounded-lg bg-slate-900/50 p-4">
					<h3 class="text-sm font-medium text-slate-300">설정 요약</h3>
					<dl class="space-y-2 text-sm">
						{#each schemaFields.filter((f) => formData[f.name]) as field (field.name)}
							<div class="flex justify-between">
								<dt class="text-slate-400">{field.label}</dt>
								<dd class="text-white">
									{#if field.type === 'color'}
										<span
											class="inline-block h-4 w-4 rounded"
											style="background-color: {formData[field.name]}"
										></span>
									{:else if field.type === 'boolean'}
										{formData[field.name] ? '예' : '아니오'}
									{:else if field.type === 'select'}
										{field.options?.find((o) => o.value === formData[field.name])?.label ||
											formData[field.name]}
									{:else if typeof formData[field.name] === 'string' && formData[field.name].length > 30}
										{formData[field.name].slice(0, 30)}...
									{:else}
										{formData[field.name]}
									{/if}
								</dd>
							</div>
						{/each}
					</dl>
				</div>

				<!-- hidden inputs -->
				<input type="hidden" name="template" value={selectedTemplate?.id} />
				{#each Object.entries(formData) as [key, value] (key)}
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
						🚀 사이트 생성하기
					{/if}
				</button>
			</form>
		{/if}
	</div>
</main>
