import { error } from '@sveltejs/kit';
import {
	findWorkflowRunBySubdomain,
	getWorkflowRun,
	getWorkflowJobs,
	type WorkflowRun,
	type WorkflowJob
} from '$lib/github';
import type { RequestHandler } from './$types';

const REPO_OWNER = 'xiyo';
const REPO_NAME = 'replica-builder';
const WORKFLOW_ID = 'provision.yml';

export interface WorkflowStatusEvent {
	type: 'searching' | 'found' | 'progress' | 'completed' | 'error';
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

	const encoder = new TextEncoder();
	let intervalId: ReturnType<typeof setInterval> | null = null;
	let isRunning = true;

	const stream = new ReadableStream({
		async start(controller) {
			const send = (data: WorkflowStatusEvent) => {
				if (!isRunning) return;
				controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
			};

			// 워크플로우 run 찾기
			send({ type: 'searching', message: '워크플로우를 검색하고 있습니다...' });

			let run: WorkflowRun | null = null;
			let attempts = 0;
			const maxAttempts = 30; // 최대 30초 대기

			// 워크플로우 run이 생성될 때까지 대기 (dispatch 직후에는 없을 수 있음)
			while (!run && attempts < maxAttempts && isRunning) {
				run = await findWorkflowRunBySubdomain(
					token,
					REPO_OWNER,
					REPO_NAME,
					WORKFLOW_ID,
					subdomain
				);
				if (!run) {
					attempts++;
					await new Promise((resolve) => setTimeout(resolve, 1000));
				}
			}

			if (!run) {
				send({ type: 'error', message: '워크플로우를 찾을 수 없습니다.' });
				controller.close();
				return;
			}

			send({ type: 'found', run, message: '워크플로우를 찾았습니다.' });

			// 상태 폴링
			const pollStatus = async () => {
				if (!isRunning || !run) return;

				const [updatedRun, jobs] = await Promise.all([
					getWorkflowRun(token, REPO_OWNER, REPO_NAME, run.id),
					getWorkflowJobs(token, REPO_OWNER, REPO_NAME, run.id)
				]);

				if (!updatedRun) {
					send({ type: 'error', message: '워크플로우 상태를 가져올 수 없습니다.' });
					return;
				}

				run = updatedRun;

				if (run.status === 'completed') {
					const deployUrl =
						run.conclusion === 'success' ? `https://${subdomain}.xiyo.dev` : undefined;

					send({
						type: 'completed',
						run,
						jobs,
						deployUrl,
						message:
							run.conclusion === 'success'
								? '배포가 완료되었습니다!'
								: `배포 실패: ${run.conclusion}`
					});

					if (intervalId) clearInterval(intervalId);
					controller.close();
					isRunning = false;
				} else {
					send({ type: 'progress', run, jobs });
				}
			};

			// 즉시 한 번 실행
			await pollStatus();

			// 3초마다 상태 확인
			if (isRunning) {
				intervalId = setInterval(pollStatus, 3000);
			}
		},

		cancel() {
			isRunning = false;
			if (intervalId) clearInterval(intervalId);
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};
