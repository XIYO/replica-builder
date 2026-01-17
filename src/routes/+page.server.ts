import { fail, error } from '@sveltejs/kit';
import { triggerWorkflowDispatch } from '$lib/github';
import type { Actions } from './$types';

const REPO_OWNER = 'xiyo';
const REPO_NAME = 'replica-builder';
const WORKFLOW_ID = 'provision.yml';

function generateSubdomain() {
	return crypto.randomUUID().split('-')[0];
}

export const actions = {
	default: async ({ request, platform }) => {
		const githubToken = platform?.env?.GITHUB_TOKEN;
		if (!githubToken) {
			error(500, 'GITHUB_TOKEN 환경변수가 설정되지 않았습니다.');
		}

		const data = await request.formData();

		const title = data.get('title')?.toString().trim();
		const topic = data.get('topic')?.toString().trim();
		const accentColor = data.get('accentColor')?.toString() || '#3b82f6';
		const customSubdomain = data.get('subdomain')?.toString().trim();

		if (!title) {
			return fail(400, {
				title,
				topic,
				error: 'title',
				message: '사이트 제목을 입력해주세요.'
			});
		}

		if (!topic) {
			return fail(400, {
				title,
				topic,
				error: 'topic',
				message: '문서 주제를 입력해주세요.'
			});
		}

		const subdomain = customSubdomain || generateSubdomain();

		const result = await triggerWorkflowDispatch(githubToken, REPO_OWNER, REPO_NAME, WORKFLOW_ID, {
			subdomain,
			title,
			topic,
			accent_color: accentColor
		});

		if (!result.success) {
			return fail(result.status, {
				title,
				topic,
				error: 'api',
				message: result.error
			});
		}

		return {
			success: true,
			deployUrl: `https://${subdomain}.xiyo.dev`
		};
	}
} satisfies Actions;
