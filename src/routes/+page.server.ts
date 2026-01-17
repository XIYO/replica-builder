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
const SUBDOMAIN_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
const REPO_OWNER = 'xiyo';
const REPO_NAME = 'replica-builder';
const WORKFLOW_ID = 'provision.yml';

export const actions = {
	default: async ({ request, platform }) => {
		const githubToken = platform?.env?.GITHUB_TOKEN;
		if (!githubToken) {
			error(500, 'GITHUB_TOKEN 환경변수가 설정되지 않았습니다.');
		}

		const data = await request.formData();

		const subdomain = data.get('subdomain')?.toString().trim().toLowerCase();
		const title = data.get('title')?.toString().trim();
		const siteType = data.get('siteType')?.toString();
		const accentColor = data.get('accentColor')?.toString() || '#3b82f6';

		if (!subdomain) {
			return fail(400, {
				subdomain,
				title,
				siteType,
				error: 'subdomain',
				message: '서브도메인을 입력해주세요.'
			});
		}

		if (!SUBDOMAIN_PATTERN.test(subdomain)) {
			return fail(400, {
				subdomain,
				title,
				siteType,
				error: 'subdomain',
				message: '소문자, 숫자, 하이픈만 사용 가능합니다.'
			});
		}

		if (subdomain.length < 2 || subdomain.length > 63) {
			return fail(400, {
				subdomain,
				title,
				siteType,
				error: 'subdomain',
				message: '2-63자 사이여야 합니다.'
			});
		}

		if (!title) {
			return fail(400, {
				subdomain,
				title,
				siteType,
				error: 'title',
				message: '사이트 제목을 입력해주세요.'
			});
		}

		if (!siteType || !VALID_SITE_TYPES.includes(siteType as (typeof VALID_SITE_TYPES)[number])) {
			return fail(400, {
				subdomain,
				title,
				siteType,
				error: 'siteType',
				message: '사이트 종류를 선택해주세요.'
			});
		}

		const result = await triggerWorkflowDispatch(
			githubToken,
			REPO_OWNER,
			REPO_NAME,
			WORKFLOW_ID,
			{
				subdomain,
				title,
				site_type: siteType,
				accent_color: accentColor
			}
		);

		if (!result.success) {
			return fail(result.status, {
				subdomain,
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
