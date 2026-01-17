import { fail, error } from '@sveltejs/kit';
import { triggerWorkflowDispatch } from '$lib/github';
import type { Actions } from './$types';

const VALID_SITE_TYPES = [
	'tech-docs',
	'product-docs',
	'api-reference',
	'learning',
	'personal'
] as const;
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
		const siteType = data.get('siteType')?.toString();
		const accentColor = data.get('accentColor')?.toString() || '#3b82f6';
		const customSubdomain = data.get('subdomain')?.toString().trim();

		if (!title) {
			return fail(400, {
				title,
				topic,
				siteType,
				error: 'title',
				message: '사이트 제목을 입력해주세요.'
			});
		}

		if (!topic) {
			return fail(400, {
				title,
				topic,
				siteType,
				error: 'topic',
				message: '문서 주제를 입력해주세요.'
			});
		}

		if (!siteType || !VALID_SITE_TYPES.includes(siteType as (typeof VALID_SITE_TYPES)[number])) {
			return fail(400, {
				title,
				topic,
				siteType,
				error: 'siteType',
				message: '사이트 종류를 선택해주세요.'
			});
		}

		const subdomain = customSubdomain || generateSubdomain();

		const result = await triggerWorkflowDispatch(githubToken, REPO_OWNER, REPO_NAME, WORKFLOW_ID, {
			subdomain,
			title,
			topic,
			site_type: siteType,
			accent_color: accentColor
		});

		if (!result.success) {
			return fail(result.status, {
				title,
				siteType,
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
