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

		// 모든 폼 데이터를 객체로 수집
		const config: Record<string, string | boolean> = {};
		for (const [key, value] of data.entries()) {
			if (key === 'template') continue; // 템플릿 ID는 별도 처리

			// boolean 값 처리
			if (value === 'true') {
				config[key] = true;
			} else if (value === 'false') {
				config[key] = false;
			} else {
				config[key] = value.toString();
			}
		}

		// 필수 필드 검증
		if (!config.title) {
			return fail(400, {
				error: 'title',
				message: '사이트 제목을 입력해주세요.'
			});
		}

		if (!config.topic) {
			return fail(400, {
				error: 'topic',
				message: '문서 주제를 입력해주세요.'
			});
		}

		// subdomain 자동 생성
		if (!config.subdomain) {
			config.subdomain = generateSubdomain();
		}

		const result = await triggerWorkflowDispatch(githubToken, REPO_OWNER, REPO_NAME, WORKFLOW_ID, {
			config: JSON.stringify(config)
		});

		if (!result.success) {
			return fail(result.status, {
				error: 'api',
				message: result.error
			});
		}

		return {
			success: true,
			deployUrl: `https://${config.subdomain}.xiyo.dev`
		};
	}
} satisfies Actions;
