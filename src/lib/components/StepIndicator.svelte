<script lang="ts">
	const { current }: { current: 1 | 2 | 3 } = $props();

	const steps = [
		{ num: 1, label: '템플릿' },
		{ num: 2, label: '설정' },
		{ num: 3, label: '생성' }
	];
</script>

<div class="mb-8 flex items-center justify-center gap-4">
	{#each steps as step (step.num)}
		<div class="flex items-center gap-2">
			<div
				class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors
				{current >= step.num ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}"
			>
				{step.num}
			</div>
			<span class="text-sm {current >= step.num ? 'text-white' : 'text-slate-500'}">
				{step.label}
			</span>
		</div>
		{#if step.num < 3}
			<div class="h-px w-8 {current > step.num ? 'bg-blue-600' : 'bg-slate-700'}"></div>
		{/if}
	{/each}
</div>
