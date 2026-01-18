export interface WorkflowInputs {
	config: string; // JSON string
}

interface GitHubErrorResponse {
	message: string;
	documentation_url?: string;
}

type TriggerResult = { success: true } | { success: false; error: string; status: number };

// 워크플로우 상태 타입
export type WorkflowStatus =
	| 'queued'
	| 'in_progress'
	| 'completed'
	| 'waiting'
	| 'requested'
	| 'pending';
export type WorkflowConclusion =
	| 'success'
	| 'failure'
	| 'cancelled'
	| 'skipped'
	| 'timed_out'
	| 'action_required'
	| null;

export interface WorkflowStep {
	name: string;
	status: 'queued' | 'in_progress' | 'completed';
	conclusion: 'success' | 'failure' | 'skipped' | 'cancelled' | null;
	number: number;
	started_at: string | null;
	completed_at: string | null;
}

export interface WorkflowJob {
	id: number;
	name: string;
	status: WorkflowStatus;
	conclusion: WorkflowConclusion;
	started_at: string | null;
	completed_at: string | null;
	steps: WorkflowStep[];
}

export interface WorkflowRun {
	id: number;
	name: string;
	status: WorkflowStatus;
	conclusion: WorkflowConclusion;
	html_url: string;
	created_at: string;
	updated_at: string;
	run_started_at: string | null;
}

interface WorkflowRunsResponse {
	total_count: number;
	workflow_runs: WorkflowRun[];
}

interface WorkflowJobsResponse {
	total_count: number;
	jobs: WorkflowJob[];
}

const GITHUB_API_BASE = 'https://api.github.com';

function githubHeaders(token: string) {
	return {
		Accept: 'application/vnd.github+json',
		Authorization: `Bearer ${token}`,
		'User-Agent': 'Replica-Builder'
	};
}

// subdomain으로 최근 워크플로우 run 찾기
// GitHub API가 workflow_dispatch inputs를 반환하지 않으므로,
// 최근 5분 내 생성된 queued/in_progress run 중 가장 최근 것을 반환
export async function findWorkflowRunBySubdomain(
	token: string,
	owner: string,
	repo: string,
	workflowId: string,
	_subdomain: string // 현재 사용하지 않음 (API 제한)
): Promise<WorkflowRun | null> {
	const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/workflows/${workflowId}/runs?per_page=10`;

	const response = await fetch(url, { headers: githubHeaders(token) });
	if (!response.ok) return null;

	const data = (await response.json()) as WorkflowRunsResponse;

	// 5분 이내에 생성된 run 중 가장 최근 것 찾기
	const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

	for (const run of data.workflow_runs) {
		const createdAt = new Date(run.created_at).getTime();

		// 5분 이내 생성된 run 찾기 (queued, in_progress, completed 모두 포함)
		if (createdAt >= fiveMinutesAgo) {
			return run;
		}
	}

	// 5분 이내 run이 없으면 가장 최근 in_progress run 반환
	const inProgressRun = data.workflow_runs.find(
		(run) => run.status === 'in_progress' || run.status === 'queued'
	);
	if (inProgressRun) return inProgressRun;

	// 그것도 없으면 가장 최근 run 반환
	return data.workflow_runs[0] || null;
}

// 워크플로우 run 상태 조회
export async function getWorkflowRun(
	token: string,
	owner: string,
	repo: string,
	runId: number
): Promise<WorkflowRun | null> {
	const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs/${runId}`;

	const response = await fetch(url, { headers: githubHeaders(token) });
	if (!response.ok) return null;

	return response.json() as Promise<WorkflowRun>;
}

// 워크플로우 run의 jobs 조회
export async function getWorkflowJobs(
	token: string,
	owner: string,
	repo: string,
	runId: number
): Promise<WorkflowJob[]> {
	const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs/${runId}/jobs`;

	const response = await fetch(url, { headers: githubHeaders(token) });
	if (!response.ok) return [];

	const data = (await response.json()) as WorkflowJobsResponse;
	return data.jobs;
}

export async function triggerWorkflowDispatch(
	token: string,
	owner: string,
	repo: string,
	workflowId: string,
	inputs: WorkflowInputs
): Promise<TriggerResult> {
	const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`;

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			Accept: 'application/vnd.github+json',
			Authorization: `Bearer ${token}`,
			'User-Agent': 'Replica-Builder'
		},
		body: JSON.stringify({
			ref: 'main',
			inputs
		})
	});

	if (response.status === 204) {
		return { success: true };
	}

	const errorData = (await response.json()) as GitHubErrorResponse;
	return {
		success: false,
		error: errorData.message,
		status: response.status
	};
}
