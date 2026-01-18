import { json, error } from '@sveltejs/kit';
import {
	findWorkflowRunBySubdomain,
	getWorkflowJobs,
	type WorkflowRun,
	type WorkflowJob
} from '$lib/github';
import type { RequestHandler } from './$types';

const REPO_OWNER = 'xiyo';
const REPO_NAME = 'replica-builder';
const WORKFLOW_ID = 'provision.yml';

export interface WorkflowStatusResponse {
	status: 'searching' | 'progress' | 'completed' | 'error';
	run?: WorkflowRun;
	jobs?: WorkflowJob[];
	message?: string;
	deployUrl?: string;
}

export const GET: RequestHandler = async ({ params, platform }) => {
	const token = platform?.env?.GITHUB_TOKEN;
	if (!token) {
		error(500, 'GITHUB_TOKEN 환경변수가 설정되지 않았습니다.');
	}

	const { subdomain } = params;
	if (!subdomain) {
		error(400, 'subdomain이 필요합니다.');
	}

	// 워크플로우 run 찾기
	const run = await findWorkflowRunBySubdomain(
		token,
		REPO_OWNER,
		REPO_NAME,
		WORKFLOW_ID,
		subdomain
	);

	if (!run) {
		return json({
			status: 'searching',
			message: '워크플로우를 검색하고 있습니다...'
		} satisfies WorkflowStatusResponse);
	}

	// jobs 조회
	const jobs = await getWorkflowJobs(token, REPO_OWNER, REPO_NAME, run.id);

	if (run.status === 'completed') {
		const deployUrl =
			run.conclusion === 'success' ? `https://${subdomain}.xiyo.dev` : undefined;

		return json({
			status: 'completed',
			run,
			jobs,
			deployUrl,
			message:
				run.conclusion === 'success'
					? '배포가 완료되었습니다!'
					: `배포 실패: ${run.conclusion}`
		} satisfies WorkflowStatusResponse);
	}

	return json({
		status: 'progress',
		run,
		jobs
	} satisfies WorkflowStatusResponse);
};
